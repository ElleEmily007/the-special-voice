/**
 * S3-compatible object storage for story audio.
 *
 * Works against AWS S3 (leave S3_ENDPOINT blank) or Cloudflare R2 / any
 * S3-compatible provider (set S3_ENDPOINT to the account endpoint).
 *
 * Audio objects must be publicly readable: TextP2P fetches the URL
 * unauthenticated when it drops a ringless voicemail.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type Voice = "male" | "female";

/** Object key prefix for story audio, so a bucket policy can scope public read to it. */
const AUDIO_PREFIX = "audio";

/** How long a presigned upload URL stays valid. */
const PRESIGN_TTL_SECONDS = 15 * 60;

let cachedClient: S3Client | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

/** True when every env var needed to talk to the bucket is present. */
export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
  );
}

function s3(): S3Client {
  if (cachedClient) return cachedClient;

  const endpoint = process.env.S3_ENDPOINT || undefined;

  cachedClient = new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint,
    // Custom endpoints (R2, MinIO) expect path-style addressing.
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });

  return cachedClient;
}

/** Strips characters that make object keys awkward to serve over HTTP. */
function slugifyFilename(filename: string): string {
  const cleaned = filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "clip.mp3";
}

/** Object key for a clip's audio, namespaced by voice. */
export function audioKey(voice: Voice, filename: string): string {
  return `${AUDIO_PREFIX}/${voice}/${slugifyFilename(filename)}`;
}

/**
 * Public HTTPS URL for an object key.
 * Prefers S3_PUBLIC_BASE_URL (custom domain or R2 public bucket URL) and
 * falls back to the AWS virtual-hosted style URL.
 */
export function publicUrlFor(key: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;

  const bucket = requireEnv("S3_BUCKET");
  const region = process.env.S3_REGION ?? "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Presigned PUT URL so the browser uploads straight to the bucket.
 * Keeps file bytes out of the Next.js request path entirely.
 */
export async function presignPutUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }> {
  const command = new PutObjectCommand({
    Bucket: requireEnv("S3_BUCKET"),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3(), command, { expiresIn: PRESIGN_TTL_SECONDS });

  return { uploadUrl, publicUrl: publicUrlFor(key), key, expiresIn: PRESIGN_TTL_SECONDS };
}

/** Server-side upload, used by the one-time import script. */
export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: requireEnv("S3_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return publicUrlFor(key);
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(
    new DeleteObjectCommand({ Bucket: requireEnv("S3_BUCKET"), Key: key }),
  );
}
