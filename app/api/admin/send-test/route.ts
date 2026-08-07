import { NextRequest, NextResponse } from "next/server";
import { sendRvm } from "@/lib/textp2p";
import { getAllClipsForVoice, absoluteAudioUrl, type Voice } from "@/lib/stories";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { secret, recipient, voice, clipId } = body as {
    secret?: string;
    recipient?: "bill" | "me";
    voice?: Voice;
    clipId?: string;
  };

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (recipient !== "bill" && recipient !== "me") {
    return NextResponse.json({ error: "recipient must be 'bill' or 'me'" }, { status: 400 });
  }

  const phone = recipient === "bill" ? process.env.ADMIN_PHONE_BILL : process.env.ADMIN_PHONE_ME;
  if (!phone) {
    return NextResponse.json(
      { error: `Missing ${recipient === "bill" ? "ADMIN_PHONE_BILL" : "ADMIN_PHONE_ME"} env var` },
      { status: 500 }
    );
  }

  if (!voice || (voice !== "male" && voice !== "female") || !clipId) {
    return NextResponse.json({ error: "voice ('male' | 'female') and clipId are required" }, { status: 400 });
  }

  const clips = getAllClipsForVoice(voice);
  const found = clips.find(({ clip }) => clip.id === clipId);
  if (!found) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const audioUrl = absoluteAudioUrl(appUrl, found.url);
  const result = await sendRvm(phone, audioUrl);

  return NextResponse.json({ ...result, phone, audioUrl, title: found.clip.title });
}
