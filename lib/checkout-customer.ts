/**
 * Turns a finished Stripe Checkout session into a Customer row.
 *
 * Signup details travel in session metadata (set from the signup cookie), so
 * the record is complete even if the person never opens the congratulations
 * page. trialEndsAt comes from the subscription so the end-of-trial and first
 * paid clips can play on the right day.
 */
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { upsertCustomerByStripeOrEmail } from "@/lib/customer-upsert";
import { deliverWelcomeIfNew } from "@/lib/delivery";
import { getPlanById } from "@/lib/plans";

function trialEndDate(trialEnd: number | null | undefined): Date | null {
  if (!trialEnd) return null;
  return new Date(trialEnd * 1000);
}

function asVoice(value: string | undefined): "male" | "female" | undefined {
  return value === "male" || value === "female" ? value : undefined;
}

function asTestament(value: string | undefined): "old" | "new" | "both" | undefined {
  return value === "old" || value === "new" || value === "both" ? value : undefined;
}

export async function saveCustomerFromCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.customer) return null;

  const stripeId = typeof session.customer === "string" ? session.customer : session.customer.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  let trialEndsAt: Date | null = null;
  const meta: Record<string, string> = { ...(session.metadata ?? {}) };

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    trialEndsAt = trialEndDate(subscription.trial_end);
    Object.assign(meta, subscription.metadata ?? {});
    // Session metadata wins when both are set — that is what checkout stored.
    Object.assign(meta, session.metadata ?? {});
  }

  const planId = meta.planId || null;
  const plan = planId ? getPlanById(planId) : undefined;
  const name = [meta.firstName, meta.lastName].filter(Boolean).join(" ").trim();
  const inTrial = trialEndsAt !== null && trialEndsAt > new Date();

  const customer = await upsertCustomerByStripeOrEmail({
    stripeId,
    email: session.customer_details?.email ?? session.customer_email ?? "",
    ...(name ? { name } : {}),
    ...(meta.phone ? { phone: meta.phone } : {}),
    ...(asVoice(meta.voice) ? { voice: asVoice(meta.voice) } : {}),
    ...(asTestament(meta.testament) ? { testament: asTestament(meta.testament) } : {}),
    ...(plan ? { frequency: plan.frequency, planId: plan.id } : planId ? { planId } : {}),
    subscriptionId,
    status: inTrial || !trialEndsAt ? "trial" : "active",
    trialEndsAt,
  });

  // Today's stories go out now. A second call (webhook plus congratulations
  // page) does not send again.
  await deliverWelcomeIfNew({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    voice: customer.voice,
    trackKey: customer.trackKey,
    frequency: customer.frequency,
    status: customer.status,
    trialEndsAt: customer.trialEndsAt,
  });

  return customer;
}
