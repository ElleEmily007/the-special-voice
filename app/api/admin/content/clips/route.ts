import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { addClipToTracks, trackKeysForTestament } from "@/lib/content";

const VoiceAudioSchema = z.object({
  url: z.string().url(),
  bytes: z.number().int().positive().optional(),
  seconds: z.number().positive().optional(),
});

const CreateClipSchema = z
  .object({
    secret: z.string().optional(),
    testament: z.enum(["old", "new"]),
    storyNumber: z.number().int().min(0),
    title: z.string().min(1).max(200),
    take: z.number().int().min(1).default(1),
    label: z.string().max(80).nullish(),
    role: z.enum(["story", "welcome", "trialEnd", "chargeStart"]).default("story"),
    status: z.enum(["draft", "live", "retired"]).default("draft"),
    male: VoiceAudioSchema.optional(),
    female: VoiceAudioSchema.optional(),
  })
  .refine((data) => data.male || data.female, {
    message: "At least one of male or female audio is required",
  });

/**
 * Creates or replaces one clip, creating its parent story on first use and
 * appending it to the tracks that carry that testament.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const auth = requireAdmin(req, (body as { secret?: string }).secret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = CreateClipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 },
    );
  }

  const { testament, storyNumber, title, take, label, role, status, male, female } = parsed.data;

  const story = await prisma.story.upsert({
    where: { testament_storyNumber: { testament, storyNumber } },
    create: { testament, storyNumber, title },
    update: { title },
  });

  // Only overwrite a voice's audio when this request actually carries it, so
  // uploading the female take later does not wipe the male one.
  const audio = {
    ...(male ? { maleUrl: male.url, maleBytes: male.bytes, maleSeconds: male.seconds } : {}),
    ...(female
      ? { femaleUrl: female.url, femaleBytes: female.bytes, femaleSeconds: female.seconds }
      : {}),
  };

  const clip = await prisma.clip.upsert({
    where: { storyId_take: { storyId: story.id, take } },
    create: { storyId: story.id, take, label: label ?? null, role, status, ...audio },
    update: { label: label ?? null, role, status, ...audio },
  });

  await addClipToTracks(clip.id, trackKeysForTestament(testament));

  return NextResponse.json({
    ok: true,
    story: { id: story.id, testament, storyNumber, title },
    clip: {
      id: clip.id,
      take: clip.take,
      label: clip.label,
      role: clip.role,
      status: clip.status,
      maleUrl: clip.maleUrl,
      femaleUrl: clip.femaleUrl,
    },
  });
}
