import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DELIVERY_CUSTOMER_SELECT, deliverToAll, deliverToCustomer } from "@/lib/delivery";

/**
 * Manual delivery trigger, protected by CRON_SECRET.
 *
 * Body: { customerId } or { all: true }, optionally with { preview: true } to
 * see which clips are next without sending anything or recording a delivery.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { customerId, all, preview } = body as {
    customerId?: string;
    all?: boolean;
    preview?: boolean;
  };

  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { ...DELIVERY_CUSTOMER_SELECT, optedOut: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (customer.optedOut) {
      return NextResponse.json({ error: "Customer has opted out", customerId }, { status: 403 });
    }

    const result = await deliverToCustomer(customer, { preview: Boolean(preview) });
    return NextResponse.json({ preview: Boolean(preview), ...result });
  }

  if (all) {
    const summary = await deliverToAll({ preview: Boolean(preview) });
    return NextResponse.json({ preview: Boolean(preview), ...summary });
  }

  return NextResponse.json({ error: "Provide customerId or all:true" }, { status: 400 });
}
