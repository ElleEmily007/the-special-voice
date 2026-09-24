import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { saveCustomerFromCheckoutSession } from "@/lib/checkout-customer";
import { getPlanByPriceId } from "@/lib/plans";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const rawBody = await getRawBody(req);
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Signup details are on the session metadata. trial_end is read inside
      // so the end-of-trial and first-paid clips have a date to key off.
      await saveCustomerFromCheckoutSession(session);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const stripeId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const status =
        sub.status === "active"
          ? "active"
          : sub.status === "trialing"
          ? "trial"
          : sub.status === "canceled"
          ? "cancelled"
          : sub.status;

      // An upgrade in the billing portal changes the price without telling us
      // the plan, so map the price back to a plan and resync the frequency —
      // otherwise we would keep delivering at the old rate.
      const priceId = sub.items.data[0]?.price?.id;
      const plan = priceId ? getPlanByPriceId(priceId) : undefined;

      await prisma.customer.updateMany({
        where: { stripeId },
        data: {
          status,
          subscriptionId: sub.id,
          ...(plan ? { planId: plan.id, frequency: plan.frequency } : {}),
          ...(sub.trial_end ? { trialEndsAt: new Date(sub.trial_end * 1000) } : {}),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const stripeId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await prisma.customer.updateMany({
        where: { stripeId },
        data: { status: "cancelled" },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
      await prisma.customer.updateMany({
        where: { stripeId },
        data: { status: "paused" },
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
      // The $0 invoice at the start of a trial also succeeds. If the trial end
      // date is still in the future, leave status as trial so the end-of-trial
      // clip can play.
      const existing = await prisma.customer.findFirst({
        where: { stripeId },
        select: { trialEndsAt: true },
      });
      if (existing?.trialEndsAt && existing.trialEndsAt > new Date()) break;

      await prisma.customer.updateMany({
        where: { stripeId },
        data: { status: "active" },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
