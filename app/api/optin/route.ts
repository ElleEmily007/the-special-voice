import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const CONSENT_TEXT =
  "I agree to receive automated text messages and/or rvm (ringless voice mail) from Cleveribility, LLC regarding my free trial and subscription to our services selected by you. Message frequency varies. Message and data rates may apply. When you wish to STOP or unsubscribe, contact us at our opt-out form at www.cleveribility.com/stop. I would like to receive offers/news and accept our Privacy Policy and Terms of Service. Consent is not a condition of purchase.";

const OptInSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .min(10, "Enter a valid US phone number")
    .regex(/^\+?[\d\s\-().]{10,}$/, "Invalid phone number format"),
  consent: z.boolean().refine((v) => v === true, { message: "You must agree to continue" }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = OptInSchema.parse(body);

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;

    await prisma.consent.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        consentText: CONSENT_TEXT,
        ip,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
