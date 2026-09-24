import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPriceId, getTrialDays, getPlanById } from "@/lib/plans";
import { readSignup } from "@/lib/signup";

export async function POST(req: NextRequest) {
  try {
    const signup = readSignup(req);
    if (!signup) {
      return NextResponse.json(
        { error: "Please finish the sign-up page before paying." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { planId } = body as { planId?: string };
    if (!planId || !getPlanById(planId)) {
      return NextResponse.json({ error: "Choose a plan to continue." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const priceId = getPriceId(planId);
    const profile = {
      planId,
      firstName: signup.firstName,
      lastName: signup.lastName,
      phone: signup.phone,
      voice: signup.voice,
      testament: signup.testament,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Account default enables Managed Payments; this product isn't set up for it
      // (eligible tax codes / MoR). Use standard Checkout as merchant of record.
      managed_payments: { enabled: false },
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: getTrialDays(planId),
        metadata: profile,
      },
      customer_email: signup.email,
      success_url: `${appUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?plan=${encodeURIComponent(planId)}`,
      allow_promotion_codes: true,
      metadata: profile,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
