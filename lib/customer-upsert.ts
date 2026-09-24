import { prisma } from "@/lib/prisma";

type CustomerWrite = {
  stripeId: string;
  email: string;
  name?: string;
  phone?: string;
  voice?: string;
  testament?: string;
  frequency?: number;
  subscriptionId?: string | null;
  planId?: string | null;
  status?: string;
  trialEndsAt?: Date | null;
};

/**
 * Upsert by stripeId, or by email when the same person re-checkouts
 * (new Stripe customer id, same email) so unique(email) does not fail.
 */
export async function upsertCustomerByStripeOrEmail(data: CustomerWrite) {
  const email = data.email.trim();

  const existing =
    (await prisma.customer.findUnique({ where: { stripeId: data.stripeId } })) ??
    (email
      ? await prisma.customer.findUnique({ where: { email } })
      : null);

  const patch = {
    stripeId: data.stripeId,
    ...(email ? { email } : {}),
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(data.voice !== undefined ? { voice: data.voice } : {}),
    // trackKey is what delivery sequencing reads, so it has to follow the
    // chosen testament rather than sitting on its default.
    ...(data.testament !== undefined
      ? { testament: data.testament, trackKey: data.testament }
      : {}),
    ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
    ...(data.subscriptionId !== undefined ? { subscriptionId: data.subscriptionId } : {}),
    ...(data.planId !== undefined ? { planId: data.planId } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.trialEndsAt !== undefined ? { trialEndsAt: data.trialEndsAt } : {}),
  };

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: patch,
    });
  }

  return prisma.customer.create({
    data: {
      stripeId: data.stripeId,
      email: email || `${data.stripeId}@pending.local`,
      name: data.name ?? "",
      phone: data.phone ?? "",
      voice: data.voice,
      testament: data.testament,
      ...(data.testament !== undefined ? { trackKey: data.testament } : {}),
      frequency: data.frequency,
      subscriptionId: data.subscriptionId ?? undefined,
      planId: data.planId ?? undefined,
      status: data.status ?? "trial",
      trialEndsAt: data.trialEndsAt ?? undefined,
    },
  });
}
