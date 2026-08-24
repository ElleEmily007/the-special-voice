import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { upsertCustomerByStripeOrEmail } from "@/lib/customer-upsert";
import { getPlanById, getPlanFrequency, getTrialDays } from "@/lib/plans";
import { z } from "zod";

const UpdateSchema = z.object({
  stripeId: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  voice: z.enum(["male", "female"]).optional(),
  testament: z.enum(["old", "new", "both"]).optional(),
  frequency: z.number().int().min(1).max(3).optional(),
});

const OnboardSchema = z.object({
  sessionId: z.string(),
  name: z.string().min(1),
  phone: z.string().min(7),
  voice: z.enum(["male", "female"]),
  testament: z.enum(["old", "new", "both"]),
});

function resolvePlanId(session: Stripe.Checkout.Session): string | null {
  const fromSession = session.metadata?.planId;
  if (fromSession) return fromSession;
  if (session.subscription && typeof session.subscription !== "string") {
    return session.subscription.metadata?.planId ?? null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const stripeId = req.nextUrl.searchParams.get("stripeId");
  const email = req.nextUrl.searchParams.get("email");
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (sessionId) {
    try {
      const { stripe } = await import("@/lib/stripe");
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
      const planId = resolvePlanId(session);
      if (!planId || !getPlanById(planId)) {
        return NextResponse.json({ error: "Plan not found for session" }, { status: 404 });
      }
      const plan = getPlanById(planId)!;
      return NextResponse.json({
        planId: plan.id,
        planName: plan.name,
        frequency: plan.frequency,
        trialDays: plan.trialDays,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!stripeId && !email) {
    return NextResponse.json({ error: "stripeId, email, or sessionId required" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: stripeId ? { stripeId } : { email: email! },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = OnboardSchema.parse(body);

    const { stripe } = await import("@/lib/stripe");
    const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
      expand: ["subscription"],
    });
    const stripeId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (!stripeId) {
      return NextResponse.json({ error: "No Stripe customer found for session" }, { status: 400 });
    }

    const planId = resolvePlanId(session);
    if (!planId || !getPlanById(planId)) {
      return NextResponse.json(
        { error: "Could not resolve purchased plan from checkout session" },
        { status: 400 },
      );
    }

    const frequency = getPlanFrequency(planId);
    const trialDays = getTrialDays(planId);

    const customer = await upsertCustomerByStripeOrEmail({
      stripeId,
      email: session.customer_email ?? "",
      name: data.name,
      phone: data.phone,
      voice: data.voice,
      testament: data.testament,
      frequency,
      planId,
      status: "trial",
    });

    return NextResponse.json({ customer, trialDays, frequency, planId });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data = UpdateSchema.parse(body);
    const { stripeId, ...updates } = data;

    const customer = await prisma.customer.update({
      where: { stripeId },
      data: updates,
    });

    return NextResponse.json({ customer });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
