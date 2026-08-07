import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRvm } from "@/lib/textp2p";
import { getClipForDelivery, absoluteAudioUrl, type Voice } from "@/lib/stories";

interface DeliveryCustomer {
  id: string;
  phone: string;
  voice: string;
  frequency: number;
  storyIndex: number;
}

async function deliverToCustomer(customer: DeliveryCustomer, appUrl: string) {
  const results: { ok: boolean; error?: string }[] = [];
  let nextIndex = customer.storyIndex;

  for (let i = 0; i < customer.frequency; i++) {
    const delivery = getClipForDelivery(nextIndex, customer.voice as Voice);
    if (!delivery) break; // no more content queued yet
    const audioUrl = absoluteAudioUrl(appUrl, delivery.url);
    const result = await sendRvm(customer.phone, audioUrl);
    results.push({ ok: result.ok, error: result.error });
    if (result.ok) nextIndex += 1;
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { storyIndex: nextIndex, lastDeliveredAt: new Date() },
  });

  return results;
}

/**
 * Vercel Cron invokes this route with GET and, when CRON_SECRET is set,
 * an `Authorization: Bearer <CRON_SECRET>` header automatically.
 * See vercel.json for the schedule.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const customers = await prisma.customer.findMany({
    where: { status: { in: ["trial", "active"] }, optedOut: false },
  });

  const summary = [];
  for (const customer of customers) {
    const results = await deliverToCustomer(customer, appUrl);
    summary.push({ customerId: customer.id, results });
  }

  return NextResponse.json({ delivered: summary.length, summary });
}
