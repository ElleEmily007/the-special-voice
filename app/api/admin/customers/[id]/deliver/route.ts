import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { deliverToCustomer, DELIVERY_CUSTOMER_SELECT } from "@/lib/delivery";

/**
 * Sends (or previews) a subscriber's next clips from the admin page.
 *
 * `preview: true` computes the sequence without contacting TextP2P or writing
 * Delivery rows, so an operator can check what is queued up safely.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const auth = requireAdmin(req, (body as { secret?: string }).secret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { ...DELIVERY_CUSTOMER_SELECT, optedOut: true },
  });

  if (!customer) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  const preview = Boolean((body as { preview?: boolean }).preview);

  if (customer.optedOut && !preview) {
    return NextResponse.json(
      { error: "This subscriber has opted out — sending would violate their STOP request." },
      { status: 403 },
    );
  }

  const result = await deliverToCustomer(customer, { preview });

  return NextResponse.json({ ok: true, preview, result });
}
