import { NextResponse } from "next/server";
import { getWelcomeAudioUrls } from "@/lib/content";

/**
 * Public voice-preview audio for the onboarding page.
 *
 * Only returns the welcome clip's already-public URLs, which is why this is
 * not behind admin auth. Reading it from the database keeps the preview
 * working after public/audio is deleted in the bucket cutover.
 */
export async function GET() {
  const urls = await getWelcomeAudioUrls();
  return NextResponse.json(urls);
}
