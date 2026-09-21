import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audioKey, isStorageConfigured, presignPutUrl } from "@/lib/storage";

/** TextP2P accepts MP3; WAV is allowed for the occasional converted clip. */
const ALLOWED_CONTENT_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"] as const;

const RequestSchema = z.object({
  secret: z.string().optional(),
  voice: z.enum(["male", "female"]),
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
});

/**
 * Hands the browser a short-lived presigned PUT so it can upload straight to
 * the bucket. Audio bytes never pass through this server, which is what keeps
 * large batches clear of the serverless request size limit.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const auth = requireAdmin(req, (body as { secret?: string }).secret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected voice ('male' | 'female'), filename and an audio contentType" },
      { status: 400 },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Audio storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
      },
      { status: 500 },
    );
  }

  const { voice, filename, contentType } = parsed.data;

  try {
    const presigned = await presignPutUrl(audioKey(voice, filename), contentType);
    return NextResponse.json(presigned);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not presign upload";
    console.error("[admin/content/upload-url]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
