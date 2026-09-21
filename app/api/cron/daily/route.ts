import { NextRequest, NextResponse } from "next/server";
import { deliverToAll } from "@/lib/delivery";
import { getTightestSubscriberRunway } from "@/lib/content";

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

  const summary = await deliverToAll();
  const runway = await getTightestSubscriberRunway();

  if (runway && runway.daysLeft <= 3) {
    console.warn(
      `[cron] Content runway low: ${runway.name} has ${runway.clipsLeft} clips left (${runway.daysLeft} days at ${runway.frequency}/day) on track "${runway.trackKey}"`,
    );
  }

  return NextResponse.json({ ...summary, runway });
}
