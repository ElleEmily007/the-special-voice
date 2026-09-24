/**
 * Short-lived signup cookie set on the first page and read when Stripe
 * Checkout is created. The phone never goes in the URL.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const SIGNUP_COOKIE = "tsv_signup";

const TTL_SECONDS = 2 * 60 * 60;

export type SignupDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  voice: "male" | "female";
  testament: "old" | "new" | "both";
};

function signingKey(): string {
  return process.env.ADMIN_SECRET || process.env.CRON_SECRET || "tsv-signup-dev";
}

function sign(body: string): string {
  return createHmac("sha256", signingKey()).update(body).digest("base64url");
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function encodeSignup(draft: SignupDraft): string {
  const body = Buffer.from(
    JSON.stringify({ ...draft, exp: Date.now() + TTL_SECONDS * 1000 }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSignup(token: string | undefined): SignupDraft | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!equals(signature, sign(body))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SignupDraft & {
      exp?: number;
    };
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    if (!parsed.email || !parsed.phone || !parsed.firstName) return null;
    if (parsed.voice !== "male" && parsed.voice !== "female") return null;
    if (parsed.testament !== "old" && parsed.testament !== "new" && parsed.testament !== "both") {
      return null;
    }
    return {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone,
      voice: parsed.voice,
      testament: parsed.testament,
    };
  } catch {
    return null;
  }
}

export function readSignup(req: NextRequest): SignupDraft | null {
  return decodeSignup(req.cookies.get(SIGNUP_COOKIE)?.value);
}

export function setSignupCookie(response: NextResponse, draft: SignupDraft): NextResponse {
  response.cookies.set({
    name: SIGNUP_COOKIE,
    value: encodeSignup(draft),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return response;
}
