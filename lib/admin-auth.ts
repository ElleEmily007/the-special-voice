/**
 * Shared passphrase auth for the /admin pages.
 *
 * A request is authorised either by sending the passphrase directly (what the
 * original admin test page did) or by carrying the signed httpOnly cookie that
 * /api/admin/verify sets. The cookie exists so the content page can upload and
 * reorder without threading the passphrase through every request, and so a
 * page refresh doesn't lock the operator out.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE = "tsv_admin";

const SESSION_TTL_SECONDS = 8 * 60 * 60;

const NOT_CONFIGURED =
  "ADMIN_SECRET is not configured on the server (set it in .env or Vercel)";
const WRONG_PASSPHRASE =
  "Incorrect passphrase — use the same value as ADMIN_SECRET on the server";

export type AdminAuth = { ok: true } | { ok: false; status: number; error: string };

function sign(expiresAt: number, key: string): string {
  return createHmac("sha256", key).update(String(expiresAt)).digest("hex");
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isValidSession(token: string, key: string): boolean {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return equals(signature, sign(expiresAt, key));
}

/**
 * Authorises an admin request. Pass the `secret` field from the request body
 * when the caller sends one; the `x-admin-secret` header and the session
 * cookie are checked either way, which is what lets GET routes authorise.
 */
export function requireAdmin(req: NextRequest, providedSecret?: string): AdminAuth {
  const key = process.env.ADMIN_SECRET;
  if (!key) return { ok: false, status: 500, error: NOT_CONFIGURED };

  const header = req.headers.get("x-admin-secret") ?? undefined;
  for (const candidate of [providedSecret, header]) {
    if (candidate && equals(candidate, key)) return { ok: true };
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie && isValidSession(cookie, key)) return { ok: true };

  return { ok: false, status: 401, error: WRONG_PASSPHRASE };
}

/** Attaches a fresh admin session cookie to a response. */
export function setAdminCookie(response: NextResponse, key: string): NextResponse {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

  response.cookies.set({
    name: ADMIN_COOKIE,
    value: `${expiresAt}.${sign(expiresAt, key)}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}

export function clearAdminCookie(response: NextResponse): NextResponse {
  response.cookies.set({ name: ADMIN_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
}
