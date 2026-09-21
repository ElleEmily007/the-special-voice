import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie, requireAdmin, setAdminCookie } from "@/lib/admin-auth";

/** Lets an admin page skip the passphrase prompt when a valid session exists. */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { secret } = body as { secret?: string };

  const auth = requireAdmin(req, secret);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // Hand back a session cookie so the admin pages survive a refresh and the
  // content routes don't have to carry the passphrase in every request.
  return setAdminCookie(NextResponse.json({ ok: true }), process.env.ADMIN_SECRET!);
}

/** Ends the admin session — the Lock button in the admin shell. */
export async function DELETE() {
  return clearAdminCookie(NextResponse.json({ ok: true }));
}
