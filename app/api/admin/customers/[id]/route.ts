import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { getCustomerRunway } from "@/lib/content";
import { PLANS, getPlanById, getPriceId } from "@/lib/plans";

const RECENT_DELIVERY_LIMIT = 20;

function planOptions() {
  return PLANS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    frequency: plan.frequency,
    monthlyPrice: plan.monthlyPrice,
  }));
}

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("updateProfile"),
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(7).max(20).optional(),
    voice: z.enum(["male", "female"]).optional(),
  }),
  z.object({
    action: z.literal("updateTrack"),
    testament: z.enum(["old", "new", "both"]),
  }),
  z.object({ action: z.literal("changePlan"), planId: z.string().min(1) }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("clearOptOut") }),
]);

async function loadDetail(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return null;

  const [deliveries, deliveredOkCount, runway] = await Promise.all([
    prisma.delivery.findMany({
      where: { customerId: id },
      orderBy: { sentAt: "desc" },
      take: RECENT_DELIVERY_LIMIT,
      select: {
        id: true,
        sentAt: true,
        ok: true,
        voice: true,
        providerStatus: true,
        error: true,
        clip: {
          select: {
            id: true,
            take: true,
            label: true,
            role: true,
            story: { select: { title: true, storyNumber: true, testament: true } },
          },
        },
      },
    }),
    prisma.delivery.count({ where: { customerId: id, ok: true } }),
    getCustomerRunway(customer),
  ]);

  return { customer, deliveries, deliveredOkCount, runway };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const detail = await loadDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    plans: planOptions(),
  });
}

/**
 * Applies one admin action. Plan and cancellation changes are pushed to Stripe
 * as well as the database so billing never drifts from what we deliver.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const auth = requireAdmin(req, (body as { secret?: string }).secret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 },
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  const input = parsed.data;

  try {
    switch (input.action) {
      case "updateProfile": {
        const { action: _action, ...fields } = input;
        await prisma.customer.update({ where: { id }, data: fields });
        break;
      }

      case "updateTrack": {
        // trackKey is what sequencing reads; keep it identical to testament.
        await prisma.customer.update({
          where: { id },
          data: { testament: input.testament, trackKey: input.testament },
        });
        break;
      }

      case "changePlan": {
        const plan = getPlanById(input.planId);
        if (!plan) {
          return NextResponse.json({ error: `Unknown plan "${input.planId}"` }, { status: 400 });
        }
        if (!customer.subscriptionId) {
          return NextResponse.json(
            { error: "This subscriber has no Stripe subscription to move." },
            { status: 409 },
          );
        }

        const { stripe } = await import("@/lib/stripe");
        const subscription = await stripe.subscriptions.retrieve(customer.subscriptionId);
        const item = subscription.items.data[0];
        if (!item) {
          return NextResponse.json(
            { error: "Stripe subscription has no line item to update." },
            { status: 409 },
          );
        }

        await stripe.subscriptions.update(customer.subscriptionId, {
          items: [{ id: item.id, price: getPriceId(plan.id) }],
          proration_behavior: "create_prorations",
          metadata: { planId: plan.id },
        });

        await prisma.customer.update({
          where: { id },
          data: { planId: plan.id, frequency: plan.frequency },
        });
        break;
      }

      case "pause": {
        // Delivery stops immediately; billing is left alone on purpose so a
        // short pause doesn't cancel the subscription.
        await prisma.customer.update({ where: { id }, data: { status: "paused" } });
        break;
      }

      case "resume": {
        const stillInTrial = customer.trialEndsAt !== null && customer.trialEndsAt > new Date();
        await prisma.customer.update({
          where: { id },
          data: { status: stillInTrial ? "trial" : "active" },
        });
        break;
      }

      case "cancel": {
        if (customer.subscriptionId) {
          const { stripe } = await import("@/lib/stripe");
          await stripe.subscriptions.update(customer.subscriptionId, {
            cancel_at_period_end: true,
          });
        }
        await prisma.customer.update({ where: { id }, data: { status: "cancelled" } });
        break;
      }

      case "clearOptOut": {
        await prisma.customer.update({
          where: { id },
          data: { optedOut: false, optedOutAt: null },
        });
        break;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const detail = await loadDetail(id);
  return NextResponse.json({ ok: true, ...detail, plans: planOptions() });
}
