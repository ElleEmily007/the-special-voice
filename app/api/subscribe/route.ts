import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPriceId, TRIAL_DAYS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, email } = body as {
      planId: string;
      email?: string;
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const priceId = getPriceId(planId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { planId },
      },
      customer_email: email ?? undefined,
      success_url: `${appUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/#pricing`,
      allow_promotion_codes: true,
      metadata: { planId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
