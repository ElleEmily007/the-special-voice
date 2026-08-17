import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const CONSENT_TEXT_RVM =
  "I agree to receive educational and informational automated ringless voicemail from Cleveribility, LLC regarding my free trial and subscription to our services selected by you. Message frequency varies. Message and data rates may apply. When you wish to STOP or unsubscribe, contact us at our opt-out form at www.cleveribility.com/stop. See our Privacy Policy and Terms of Service to learn more. Consent is not a condition of purchase.";

export const CONSENT_TEXT_MMS =
  "I agree to receive educational and informational multi-media messages from Cleveribility, LLC regarding my free trial and subscription to our services selected by you. Message frequency varies. Message and data rates may apply. When you wish to STOP or unsubscribe, contact us at our opt-out form at www.cleveribility.com/stop. See our Privacy Policy and Terms of Service to learn more. Consent is not a condition of purchase.";

const OptInSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .min(10, "Enter a valid US phone number")
    .regex(/^\+?[\d\s\-().]{10,}$/, "Invalid phone number format"),
  consentRvm: z.boolean().refine((v) => v === true, { message: "You must agree to continue" }),
  consentMms: z.boolean().refine((v) => v === true, { message: "You must agree to continue" }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = OptInSchema.parse(body);

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;

    const shared = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      ip,
    };

    await prisma.$transaction([
      prisma.consent.create({
        data: { ...shared, channel: "rvm", consentText: CONSENT_TEXT_RVM },
      }),
      prisma.consent.create({
        data: { ...shared, channel: "mms", consentText: CONSENT_TEXT_MMS },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
