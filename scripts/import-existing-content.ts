/**
 * One-time import: moves the frozen manifest in scripts/legacy-manifest.ts and
 * the committed public/audio files into object storage and the database.
 *
 *   npx tsx scripts/import-existing-content.ts --dry-run
 *   npx tsx scripts/import-existing-content.ts
 *   npx tsx scripts/import-existing-content.ts --skip-upload
 *
 * Safe to run more than once: stories, clips and tracks are upserted by
 * natural key, and delivery backfill skips rows that already exist.
 *
 * --dry-run      report what would change, write nothing
 * --skip-upload  keep the existing /audio/... URLs instead of uploading to the
 *                bucket, so the database half can be tested before storage is
 *                provisioned
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { STORY_CLIPS, type StoryClip } from "./legacy-manifest";
import { audioKey, isStorageConfigured, uploadObject } from "../lib/storage";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_UPLOAD = process.argv.includes("--skip-upload");

const AUDIO_ROOT = path.join(process.cwd(), "public", "audio");
const TESTAMENT = "new";

/** Tracks that every New Testament clip belongs to. */
const TARGET_TRACKS: { key: string; name: string }[] = [
  { key: "new", name: "New Testament" },
  { key: "both", name: "Complete Bible" },
];

const ALL_TRACKS: { key: string; name: string }[] = [
  ...TARGET_TRACKS,
  { key: "old", name: "Old Testament" },
];

function log(...args: unknown[]) {
  console.log(...args);
}

/** "Joseph's Dream (Part 2)" -> { title: "Joseph's Dream", label: "Part 2" } */
function splitTitle(raw: string): { title: string; label: string | null } {
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!match) return { title: raw, label: null };
  return { title: match[1].trim(), label: match[2].trim() };
}

function roleFor(clip: StoryClip): string {
  if (clip.id === "000-welcome") return "welcome";
  if (clip.isFreeTrialEnd) return "trialEnd";
  if (clip.isChargeStart) return "chargeStart";
  return "story";
}

/** Base title for a story number, taken from its lowest take. */
function storyTitleFor(storyNumber: number): string {
  const clips = STORY_CLIPS.filter((c) => c.storyNumber === storyNumber).sort(
    (a, b) => a.take - b.take,
  );
  return splitTitle(clips[0].title).title;
}

async function uploadVoiceFile(
  voice: "male" | "female",
  filename: string,
): Promise<{ url: string; bytes: number }> {
  const filePath = path.join(AUDIO_ROOT, voice, filename);
  const buffer = await readFile(filePath);

  if (SKIP_UPLOAD) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    return { url: `${appUrl}/audio/${voice}/${filename}`, bytes: buffer.byteLength };
  }

  const key = audioKey(voice, filename);
  if (DRY_RUN) {
    log(`  would upload ${voice}/${filename} -> ${key} (${buffer.byteLength} bytes)`);
    return { url: `pending://${key}`, bytes: buffer.byteLength };
  }

  const url = await uploadObject(key, buffer, "audio/mpeg");
  return { url, bytes: buffer.byteLength };
}

async function importClips() {
  const storyNumbers = [...new Set(STORY_CLIPS.map((c) => c.storyNumber))].sort((a, b) => a - b);
  log(`Importing ${STORY_CLIPS.length} clips across ${storyNumbers.length} stories.`);

  /** legacyId -> Clip.id, used when building tracks and backfilling deliveries. */
  const clipIdByLegacyId = new Map<string, string>();

  for (const storyNumber of storyNumbers) {
    const title = storyTitleFor(storyNumber);

    let storyId = `dry-run-story-${storyNumber}`;
    if (!DRY_RUN) {
      const story = await prisma.story.upsert({
        where: { testament_storyNumber: { testament: TESTAMENT, storyNumber } },
        create: { testament: TESTAMENT, storyNumber, title },
        update: { title },
      });
      storyId = story.id;
    }
    log(`Story ${storyNumber}: ${title}`);

    const clips = STORY_CLIPS.filter((c) => c.storyNumber === storyNumber).sort(
      (a, b) => a.take - b.take,
    );

    for (const clip of clips) {
      const { label } = splitTitle(clip.title);
      const role = roleFor(clip);
      const status = clip.active ? "live" : "draft";

      const male = await uploadVoiceFile("male", clip.maleFile);
      const female = await uploadVoiceFile("female", clip.femaleFile);

      const data = {
        storyId,
        take: clip.take,
        label,
        maleUrl: male.url,
        femaleUrl: female.url,
        maleBytes: male.bytes,
        femaleBytes: female.bytes,
        status,
        role,
      };

      if (DRY_RUN) {
        log(`  clip ${clip.id} take ${clip.take} status=${status} role=${role}`);
        clipIdByLegacyId.set(clip.id, `dry-run-clip-${clip.id}`);
        continue;
      }

      const saved = await prisma.clip.upsert({
        where: { legacyId: clip.id },
        create: { ...data, legacyId: clip.id },
        update: data,
      });
      clipIdByLegacyId.set(clip.id, saved.id);
      log(`  clip ${clip.id} take ${clip.take} status=${status} role=${role}`);
    }
  }

  return clipIdByLegacyId;
}

async function seedTracks(clipIdByLegacyId: Map<string, string>) {
  // The live sequence is the clips flagged active, in their manifest index order.
  const sequence = STORY_CLIPS.filter((c) => c.active).sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );

  log(`\nSeeding tracks with ${sequence.length} live clips.`);

  for (const { key, name } of ALL_TRACKS) {
    if (DRY_RUN) {
      const count = TARGET_TRACKS.some((t) => t.key === key) ? sequence.length : 0;
      log(`  track "${key}" (${name}): ${count} items`);
      continue;
    }

    const track = await prisma.track.upsert({
      where: { key },
      create: { key, name },
      update: { name },
    });

    // Only the New Testament content exists, so the "old" track stays empty.
    if (!TARGET_TRACKS.some((t) => t.key === key)) {
      log(`  track "${key}" (${name}): 0 items (no content yet)`);
      continue;
    }

    // Rewrite the whole track so positions stay contiguous and the
    // [trackId, position] unique constraint never collides mid-update.
    await prisma.$transaction([
      prisma.trackItem.deleteMany({ where: { trackId: track.id } }),
      prisma.trackItem.createMany({
        data: sequence.map((clip, position) => ({
          trackId: track.id,
          clipId: clipIdByLegacyId.get(clip.id)!,
          position,
        })),
      }),
    ]);

    log(`  track "${key}" (${name}): ${sequence.length} items`);
  }
}

async function backfillDeliveries(clipIdByLegacyId: Map<string, string>) {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      voice: true,
      testament: true,
      storyIndex: true,
      lastDeliveredAt: true,
      createdAt: true,
    },
  });

  log(`\nBackfilling delivery history for ${customers.length} customers.`);
  if (customers.length === 0) return;

  // Historically every customer read the same flat New Testament sequence,
  // whatever testament they picked, so that is the truth we backfill from.
  const sequence = STORY_CLIPS.filter((c) => c.active).sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );

  for (const customer of customers) {
    const consumed = sequence.slice(0, customer.storyIndex);
    const voice = customer.voice === "male" ? "male" : "female";
    const sentAt = customer.lastDeliveredAt ?? customer.createdAt;

    // testament values map 1:1 onto track keys.
    const trackKey = customer.testament;

    if (DRY_RUN) {
      log(
        `  ${customer.name}: trackKey="${trackKey}", ${consumed.length} delivery rows (storyIndex ${customer.storyIndex})`,
      );
      continue;
    }

    await prisma.customer.update({ where: { id: customer.id }, data: { trackKey } });

    if (consumed.length > 0) {
      await prisma.delivery.createMany({
        data: consumed.map((clip) => ({
          customerId: customer.id,
          clipId: clipIdByLegacyId.get(clip.id)!,
          voice,
          audioUrl: null,
          sentAt,
          ok: true,
        })),
        skipDuplicates: true,
      });
    }

    log(
      `  ${customer.name}: trackKey="${trackKey}", ${consumed.length} delivery rows (storyIndex ${customer.storyIndex})`,
    );

    const trackItems = await prisma.trackItem.count({ where: { track: { key: trackKey } } });
    if (trackItems === 0) {
      log(
        `    WARNING: track "${trackKey}" has no clips, so this customer will receive nothing until content is added to it.`,
      );
    }
  }
}

async function main() {
  if (DRY_RUN) log("DRY RUN — no changes will be written.\n");

  if (!SKIP_UPLOAD && !isStorageConfigured()) {
    throw new Error(
      "Storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, " +
        "or re-run with --skip-upload to keep the existing /audio/... URLs.",
    );
  }
  if (SKIP_UPLOAD) {
    log("--skip-upload: keeping existing /audio/... URLs, nothing sent to the bucket.\n");
  }

  const clipIdByLegacyId = await importClips();
  await seedTracks(clipIdByLegacyId);
  await backfillDeliveries(clipIdByLegacyId);

  log("\nDone. Clip durations are left empty for imported clips; new uploads");
  log("record duration in the browser before upload.");
}

main()
  .catch((err) => {
    console.error("\nImport failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
