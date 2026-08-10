import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertCustomerByStripeOrEmail } from "@/lib/customer-upsert";
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
  frequency: z.number().int().min(1).max(3),
});

export async function GET(req: NextRequest) {
  const stripeId = req.nextUrl.searchParams.get("stripeId");
  const email = req.nextUrl.searchParams.get("email");

  if (!stripeId && !email) {
    return NextResponse.json({ error: "stripeId or email required" }, { status: 400 });
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

    // Retrieve Stripe session to get customer ID
    const { stripe } = await import("@/lib/stripe");
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    const stripeId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (!stripeId) {
      return NextResponse.json({ error: "No Stripe customer found for session" }, { status: 400 });
    }

    const customer = await upsertCustomerByStripeOrEmail({
      stripeId,
      email: session.customer_email ?? "",
      name: data.name,
      phone: data.phone,
      voice: data.voice,
      testament: data.testament,
      frequency: data.frequency,
      status: "trial",
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
