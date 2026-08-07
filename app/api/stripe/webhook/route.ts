import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
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
      if (session.mode === "subscription" && session.customer) {
        const stripeId = typeof session.customer === "string" ? session.customer : session.customer.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        // Customer record is created/updated in onboarding; here we ensure stripeId is linked
        await prisma.customer.upsert({
          where: { stripeId },
          update: {
            subscriptionId: subscriptionId ?? undefined,
            status: "trial",
          },
          create: {
            stripeId,
            name: "",
            email: session.customer_email ?? "",
            phone: "",
            subscriptionId: subscriptionId ?? undefined,
            planId: session.metadata?.planId ?? null,
            status: "trial",
          },
        });
      }
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

      await prisma.customer.updateMany({
        where: { stripeId },
        data: {
          status,
          subscriptionId: sub.id,
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
