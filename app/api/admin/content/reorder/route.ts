import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getTrackOrder, reorderTrack } from "@/lib/content";

const ReorderSchema = z.object({
  secret: z.string().optional(),
  trackKey: z.string().min(1),
  clipIds: z.array(z.string().min(1)).min(1),
});

/**
 * Rewrites the delivery order of a track. Because a customer's position is
 * derived from what they have already received, reordering never disturbs an
 * existing subscriber — they simply carry on with whatever they have not heard.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const auth = requireAdmin(req, (body as { secret?: string }).secret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected trackKey and a clipIds array" }, { status: 400 });
  }

  const { trackKey, clipIds } = parsed.data;

  try {
    const count = await reorderTrack(trackKey, clipIds);
    return NextResponse.json({ ok: true, count, trackOrder: await getTrackOrder(trackKey) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not reorder the track";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
