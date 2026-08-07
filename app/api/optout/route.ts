import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const OptOutSchema = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid US phone number")
    .regex(/^\+?[\d\s\-().]{10,}$/, "Invalid phone number format"),
});

/** Normalize to digits only for loose phone matching. */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = OptOutSchema.parse(body);
    const target = digitsOnly(data.phone);

    // Always return success to the client to avoid phone enumeration.
    // Still attempt to mark matching customers as opted out.
    const customers = await prisma.customer.findMany({
      where: { optedOut: false },
      select: { id: true, phone: true },
    });

    const matches = customers.filter((c) => {
      const stored = digitsOnly(c.phone);
      return stored === target || stored.endsWith(target) || target.endsWith(stored);
    });

    if (matches.length > 0) {
      await prisma.customer.updateMany({
        where: { id: { in: matches.map((m) => m.id) } },
        data: { optedOut: true, optedOutAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
