import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { secret } = body as { secret?: string };

  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_SECRET is not configured on the server" },
      { status: 500 },
    );
  }

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: "Incorrect passphrase" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
