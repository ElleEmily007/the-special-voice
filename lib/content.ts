/**
 * Database-backed story catalogue and delivery sequencing.
 *
 * Replaces the hand-written manifest that used to live in lib/stories.ts.
 * Two things matter here:
 *
 *  1. A customer's position is derived from their Delivery rows, not from a
 *     stored index, so inserting or reordering content never shifts anyone.
 *  2. Trial-end and charge-start narration is injected based on the customer's
 *     own trial dates rather than occupying a fixed slot in the sequence,
 *     which is what makes the tiered 9 / 6 / 3 day trials work.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type Voice = "male" | "female";
export type ClipStatus = "draft" | "live" | "retired";
export type ClipRole = "story" | "welcome" | "trialEnd" | "chargeStart";

/** Roles that take their turn in the ordered track. */
const SEQUENCED_ROLES: ClipRole[] = ["story", "welcome"];

/** TextP2P guidance for a single ringless voicemail drop. */
export const MAX_CLIP_BYTES = 1_000_000;
export const MAX_CLIP_SECONDS = 60;

export interface DeliverableClip {
  clipId: string;
  storyNumber: number;
  storyTitle: string;
  label: string | null;
  take: number;
  role: string;
  position: number | null;
  audioUrl: string;
}

interface DeliveryTarget {
  id: string;
  voice: string;
  trackKey: string;
  status: string;
  trialEndsAt: Date | null;
}

function isVoice(value: string): value is Voice {
  return value === "male" || value === "female";
}

/** Only match clips that actually have audio for the voice being delivered. */
function voiceHasAudio(voice: Voice): Prisma.ClipWhereInput {
  return voice === "male" ? { maleUrl: { not: null } } : { femaleUrl: { not: null } };
}

export function audioUrlForVoice(
  clip: { maleUrl: string | null; femaleUrl: string | null },
  voice: Voice,
): string | null {
  return voice === "male" ? clip.maleUrl : clip.femaleUrl;
}

function toDeliverable(
  item: {
    position: number | null;
    clip: {
      id: string;
      take: number;
      label: string | null;
      role: string;
      maleUrl: string | null;
      femaleUrl: string | null;
      story: { storyNumber: number; title: string };
    };
  },
  voice: Voice,
): DeliverableClip | null {
  const audioUrl = audioUrlForVoice(item.clip, voice);
  if (!audioUrl) return null;

  return {
    clipId: item.clip.id,
    storyNumber: item.clip.story.storyNumber,
    storyTitle: item.clip.story.title,
    label: item.clip.label,
    take: item.clip.take,
    role: item.clip.role,
    position: item.position,
    audioUrl,
  };
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Which one-off narration, if any, this customer is due.
 *
 * On the final day of the trial they get the trial-end clip; once the trial
 * date has passed and billing has begun they get the charge-start clip. Each
 * is sent at most once, guarded by the customer's delivery history.
 */
function dueSpecialRole(customer: DeliveryTarget, now: Date): ClipRole | null {
  if (!customer.trialEndsAt) return null;

  const trialEnd = startOfDay(customer.trialEndsAt);
  const today = startOfDay(now);

  if (customer.status === "trial" && trialEnd <= today) return "trialEnd";
  if (customer.status !== "trial" && customer.trialEndsAt <= now) return "chargeStart";

  return null;
}

async function findClipByRole(
  customer: DeliveryTarget,
  voice: Voice,
  role: ClipRole,
): Promise<DeliverableClip | null> {
  const item = await prisma.trackItem.findFirst({
    where: {
      track: { key: customer.trackKey },
      clip: {
        status: "live",
        role,
        ...voiceHasAudio(voice),
        deliveries: { none: { customerId: customer.id, ok: true } },
      },
    },
    orderBy: { position: "asc" },
    include: { clip: { include: { story: true } } },
  });

  return item ? toDeliverable(item, voice) : null;
}

/**
 * The next clips to deliver: the lowest-position live clips in the customer's
 * track that have never been successfully delivered to them.
 */
async function findSequenceClips(
  customer: DeliveryTarget,
  voice: Voice,
  count: number,
): Promise<DeliverableClip[]> {
  if (count <= 0) return [];

  const items = await prisma.trackItem.findMany({
    where: {
      track: { key: customer.trackKey },
      clip: {
        status: "live",
        role: { in: SEQUENCED_ROLES },
        ...voiceHasAudio(voice),
        deliveries: { none: { customerId: customer.id, ok: true } },
      },
    },
    orderBy: { position: "asc" },
    take: count,
    include: { clip: { include: { story: true } } },
  });

  return items
    .map((item) => toDeliverable(item, voice))
    .filter((clip): clip is DeliverableClip => clip !== null);
}

/**
 * Everything to send this customer in one delivery run, at most `count` clips.
 * Returns fewer than `count` when the track has run out of content.
 */
export async function getNextClipsForCustomer(
  customer: DeliveryTarget,
  count: number,
  now: Date = new Date(),
): Promise<DeliverableClip[]> {
  const voice = isVoice(customer.voice) ? customer.voice : "female";
  const clips: DeliverableClip[] = [];

  const specialRole = dueSpecialRole(customer, now);
  if (specialRole) {
    const special = await findClipByRole(customer, voice, specialRole);
    if (special) clips.push(special);
  }

  const sequence = await findSequenceClips(customer, voice, count - clips.length);
  clips.push(...sequence);

  return clips;
}

/**
 * Records the outcome of a send. Upserting on [customerId, clipId] means a
 * successful clip is never sent twice, while a failed attempt is updated in
 * place so the next run retries it.
 */
export async function recordDelivery(params: {
  customerId: string;
  clipId: string;
  voice: string;
  audioUrl: string;
  ok: boolean;
  providerStatus?: number;
  error?: string;
  sentAt?: Date;
}): Promise<void> {
  const data = {
    voice: params.voice,
    audioUrl: params.audioUrl,
    ok: params.ok,
    providerStatus: params.providerStatus ?? null,
    error: params.error ?? null,
    sentAt: params.sentAt ?? new Date(),
  };

  await prisma.delivery.upsert({
    where: { customerId_clipId: { customerId: params.customerId, clipId: params.clipId } },
    create: { customerId: params.customerId, clipId: params.clipId, ...data },
    update: data,
  });
}

export interface TrackRunway {
  trackKey: string;
  name: string;
  liveClips: number;
  draftClips: number;
  days: { once: number; twice: number; thrice: number };
}

/**
 * How much content a brand-new subscriber on this track would have, expressed
 * in days at each delivery frequency.
 */
export async function getRunway(trackKey: string): Promise<TrackRunway | null> {
  const track = await prisma.track.findUnique({ where: { key: trackKey } });
  if (!track) return null;

  const [liveClips, draftClips] = await Promise.all([
    prisma.trackItem.count({
      where: { trackId: track.id, clip: { status: "live", role: { in: SEQUENCED_ROLES } } },
    }),
    prisma.trackItem.count({ where: { trackId: track.id, clip: { status: "draft" } } }),
  ]);

  return {
    trackKey: track.key,
    name: track.name,
    liveClips,
    draftClips,
    days: {
      once: liveClips,
      twice: Math.floor(liveClips / 2),
      thrice: Math.floor(liveClips / 3),
    },
  };
}

export async function getAllRunways(): Promise<TrackRunway[]> {
  const tracks = await prisma.track.findMany({ orderBy: { key: "asc" } });
  const runways = await Promise.all(tracks.map((track) => getRunway(track.key)));
  return runways.filter((runway): runway is TrackRunway => runway !== null);
}

export interface SubscriberRunway {
  customerId: string;
  name: string;
  trackKey: string;
  frequency: number;
  clipsLeft: number;
  daysLeft: number;
}

/** How many unheard clips one subscriber has left, and how many days that is. */
export async function getCustomerRunway(customer: {
  id: string;
  name: string;
  trackKey: string;
  frequency: number;
  voice: string;
}): Promise<SubscriberRunway> {
  const voice = isVoice(customer.voice) ? customer.voice : "female";

  const clipsLeft = await prisma.trackItem.count({
    where: {
      track: { key: customer.trackKey },
      clip: {
        status: "live",
        role: { in: SEQUENCED_ROLES },
        ...voiceHasAudio(voice),
        deliveries: { none: { customerId: customer.id, ok: true } },
      },
    },
  });

  const frequency = Math.max(1, customer.frequency);

  return {
    customerId: customer.id,
    name: customer.name,
    trackKey: customer.trackKey,
    frequency,
    clipsLeft,
    daysLeft: Math.floor(clipsLeft / frequency),
  };
}

/**
 * The subscriber closest to running out of content. This is the number worth
 * alerting on, since it accounts for how far each person has already read and
 * how fast they consume clips.
 */
export async function getTightestSubscriberRunway(): Promise<SubscriberRunway | null> {
  const customers = await prisma.customer.findMany({
    where: { status: { in: ["trial", "active"] }, optedOut: false },
    select: { id: true, name: true, trackKey: true, frequency: true, voice: true },
  });

  const runways: SubscriberRunway[] = [];
  for (const customer of customers) {
    runways.push(await getCustomerRunway(customer));
  }

  if (runways.length === 0) return null;
  return runways.reduce((tightest, current) =>
    current.daysLeft < tightest.daysLeft ? current : tightest,
  );
}

export interface AdminClip {
  id: string;
  take: number;
  label: string | null;
  status: string;
  role: string;
  maleUrl: string | null;
  femaleUrl: string | null;
  maleBytes: number | null;
  femaleBytes: number | null;
  maleSeconds: number | null;
  femaleSeconds: number | null;
  positions: { trackKey: string; position: number }[];
  deliveredCount: number;
}

export interface AdminStory {
  id: string;
  testament: string;
  storyNumber: number;
  title: string;
  clips: AdminClip[];
}

/** Story list for the admin content page, grouped by story with takes nested. */
export async function getStoriesForAdmin(filters: {
  testament?: string;
  status?: string;
} = {}): Promise<AdminStory[]> {
  const stories = await prisma.story.findMany({
    where: {
      ...(filters.testament ? { testament: filters.testament } : {}),
      ...(filters.status ? { clips: { some: { status: filters.status } } } : {}),
    },
    orderBy: [{ testament: "asc" }, { storyNumber: "asc" }],
    include: {
      clips: {
        where: filters.status ? { status: filters.status } : undefined,
        orderBy: { take: "asc" },
        include: {
          trackItems: { include: { track: { select: { key: true } } } },
          _count: { select: { deliveries: true } },
        },
      },
    },
  });

  return stories.map((story) => ({
    id: story.id,
    testament: story.testament,
    storyNumber: story.storyNumber,
    title: story.title,
    clips: story.clips.map((clip) => ({
      id: clip.id,
      take: clip.take,
      label: clip.label,
      status: clip.status,
      role: clip.role,
      maleUrl: clip.maleUrl,
      femaleUrl: clip.femaleUrl,
      maleBytes: clip.maleBytes,
      femaleBytes: clip.femaleBytes,
      maleSeconds: clip.maleSeconds,
      femaleSeconds: clip.femaleSeconds,
      positions: clip.trackItems
        .map((item) => ({ trackKey: item.track.key, position: item.position }))
        .sort((a, b) => a.trackKey.localeCompare(b.trackKey)),
      deliveredCount: clip._count.deliveries,
    })),
  }));
}

export interface TrackOrderEntry {
  clipId: string;
  position: number;
  status: string;
  role: string;
  storyNumber: number;
  storyTitle: string;
  take: number;
  label: string | null;
}

/** The ordered contents of one track, for the reorder UI. */
export async function getTrackOrder(trackKey: string): Promise<TrackOrderEntry[]> {
  const items = await prisma.trackItem.findMany({
    where: { track: { key: trackKey } },
    orderBy: { position: "asc" },
    include: { clip: { include: { story: true } } },
  });

  return items.map((item) => ({
    clipId: item.clip.id,
    position: item.position,
    status: item.clip.status,
    role: item.clip.role,
    storyNumber: item.clip.story.storyNumber,
    storyTitle: item.clip.story.title,
    take: item.clip.take,
    label: item.clip.label,
  }));
}

/**
 * Rewrites a track's ordering. Deleting and recreating the whole track avoids
 * transient collisions on the [trackId, position] unique constraint that a
 * position-by-position update would hit.
 */
export async function reorderTrack(trackKey: string, clipIds: string[]): Promise<number> {
  const track = await prisma.track.findUnique({ where: { key: trackKey } });
  if (!track) throw new Error(`Unknown track "${trackKey}"`);

  const existing = await prisma.trackItem.findMany({
    where: { trackId: track.id },
    select: { clipId: true },
  });
  const existingIds = new Set(existing.map((item) => item.clipId));

  if (clipIds.length !== existingIds.size || !clipIds.every((id) => existingIds.has(id))) {
    throw new Error("The clip list must contain exactly the clips already in the track");
  }

  await prisma.$transaction([
    prisma.trackItem.deleteMany({ where: { trackId: track.id } }),
    prisma.trackItem.createMany({
      data: clipIds.map((clipId, position) => ({ trackId: track.id, clipId, position })),
    }),
  ]);

  return clipIds.length;
}

/** Appends a clip to the end of every track that should carry it. */
export async function addClipToTracks(clipId: string, trackKeys: string[]): Promise<void> {
  for (const key of trackKeys) {
    const track = await prisma.track.findUnique({ where: { key } });
    if (!track) continue;

    const existing = await prisma.trackItem.findUnique({
      where: { trackId_clipId: { trackId: track.id, clipId } },
    });
    if (existing) continue;

    const last = await prisma.trackItem.findFirst({
      where: { trackId: track.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await prisma.trackItem.create({
      data: { trackId: track.id, clipId, position: (last?.position ?? -1) + 1 },
    });
  }
}

/** Tracks a testament's clips belong to: its own track plus the combined one. */
export function trackKeysForTestament(testament: string): string[] {
  return testament === "old" ? ["old", "both"] : ["new", "both"];
}

/**
 * URL prefixes that mean "still served by the app itself out of public/audio"
 * rather than from the audio bucket.
 */
function legacyAudioPrefixes(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return appUrl ? ["/audio/", `${appUrl}/audio/`] : ["/audio/"];
}

/**
 * How many clips still point at public/audio. Non-zero means the one-time
 * bucket import has not been run (or not finished), so those clips would be
 * lost the moment public/audio is deleted.
 */
export async function countLegacyAudioClips(): Promise<number> {
  const prefixes = legacyAudioPrefixes();

  return prisma.clip.count({
    where: {
      OR: prefixes.flatMap((prefix) => [
        { maleUrl: { startsWith: prefix } },
        { femaleUrl: { startsWith: prefix } },
      ]),
    },
  });
}

/**
 * Audio for the voice preview on the onboarding page, read from the welcome
 * clip so the preview follows the bucket instead of a hard-coded public path.
 */
export async function getWelcomeAudioUrls(): Promise<{
  male: string | null;
  female: string | null;
}> {
  const clip = await prisma.clip.findFirst({
    where: { role: "welcome", status: { not: "retired" } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: { maleUrl: true, femaleUrl: true },
  });

  return { male: clip?.maleUrl ?? null, female: clip?.femaleUrl ?? null };
}
