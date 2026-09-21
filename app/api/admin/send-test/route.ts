import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRvm } from "@/lib/textp2p";
import { requireAdmin } from "@/lib/admin-auth";
import { audioUrlForVoice, type Voice } from "@/lib/content";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { secret, recipient, voice, clipId } = body as {
    secret?: string;
    recipient?: "bill" | "me";
    voice?: Voice;
    clipId?: string;
  };

  const auth = requireAdmin(req, secret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (recipient !== "bill" && recipient !== "me") {
    return NextResponse.json({ error: "recipient must be 'bill' or 'me'" }, { status: 400 });
  }

  const phone = recipient === "bill" ? process.env.ADMIN_PHONE_BILL : process.env.ADMIN_PHONE_ME;
  if (!phone) {
    return NextResponse.json(
      { error: `Missing ${recipient === "bill" ? "ADMIN_PHONE_BILL" : "ADMIN_PHONE_ME"} env var` },
      { status: 500 },
    );
  }

  if (!voice || (voice !== "male" && voice !== "female") || !clipId) {
    return NextResponse.json(
      { error: "voice ('male' | 'female') and clipId are required" },
      { status: 400 },
    );
  }

  const clip = await prisma.clip.findUnique({
    where: { id: clipId },
    include: { story: { select: { title: true } } },
  });
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const audioUrl = audioUrlForVoice(clip, voice);
  if (!audioUrl) {
    return NextResponse.json(
      { error: `This clip has no ${voice} recording yet` },
      { status: 400 },
    );
  }

  const result = await sendRvm(phone, audioUrl);

  return NextResponse.json({
    ...result,
    phone,
    audioUrl,
    title: `${clip.story.title}${clip.label ? ` (${clip.label})` : ""}`,
  });
}
