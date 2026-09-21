import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isStorageConfigured } from "@/lib/storage";
import {
  MAX_CLIP_BYTES,
  MAX_CLIP_SECONDS,
  countLegacyAudioClips,
  getAllRunways,
  getStoriesForAdmin,
  getTightestSubscriberRunway,
  getTrackOrder,
} from "@/lib/content";

/**
 * Everything the admin content page renders: the story list, the ordered
 * track, and the content runway figures.
 *
 * Query: ?testament=new|old &status=draft|live|retired &track=new|old|both
 */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = req.nextUrl.searchParams;
  const testament = params.get("testament") ?? undefined;
  const status = params.get("status") ?? undefined;
  const trackKey = params.get("track") ?? "new";

  const [stories, runways, tightest, trackOrder, legacyAudioCount] = await Promise.all([
    getStoriesForAdmin({ testament, status }),
    getAllRunways(),
    getTightestSubscriberRunway(),
    getTrackOrder(trackKey),
    countLegacyAudioClips(),
  ]);

  return NextResponse.json({
    stories,
    runways,
    tightestSubscriber: tightest,
    trackKey,
    trackOrder,
    storageConfigured: isStorageConfigured(),
    legacyAudioCount,
    limits: { maxBytes: MAX_CLIP_BYTES, maxSeconds: MAX_CLIP_SECONDS },
  });
}
