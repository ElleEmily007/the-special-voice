"use client";
import { useState } from "react";
import { Lock, Send, Loader2, CheckCircle2, XCircle, Star, ArrowRightCircle, Flag } from "lucide-react";
import { getAllClipsForVoice, type Voice } from "@/lib/stories";

type SendStatus =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; dryRun: boolean }
  | { state: "error"; message: string };

function VoiceColumn({ voice, secret }: { voice: Voice; secret: string }) {
  const clips = getAllClipsForVoice(voice);
  const [status, setStatus] = useState<Record<string, SendStatus>>({});

  async function send(clipId: string, recipient: "bill" | "me") {
    const key = `${clipId}:${recipient}`;
    setStatus((s) => ({ ...s, [key]: { state: "sending" } }));
    try {
      const res = await fetch("/api/admin/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, recipient, voice, clipId }),
      });
      const data = await res.json() as { ok?: boolean; dryRun?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus((s) => ({ ...s, [key]: { state: "error", message: data.error ?? "Send failed" } }));
        return;
      }
      setStatus((s) => ({ ...s, [key]: { state: "sent", dryRun: !!data.dryRun } }));
    } catch {
      setStatus((s) => ({ ...s, [key]: { state: "error", message: "Network error" } }));
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bold text-lg text-[#0f2035] mb-3 capitalize">
        {voice} voice — {voice === "male" ? "David" : "Sarah"}
      </h2>
      <div className="space-y-3">
        {clips.map(({ clip, url }) => {
          const billStatus = status[`${clip.id}:bill`] ?? { state: "idle" };
          const meStatus = status[`${clip.id}:me`] ?? { state: "idle" };
          return (
            <div
              key={clip.id}
              className={`border rounded-xl p-4 ${
                clip.active ? "border-[#e8b800]/40 bg-[#e8b800]/5" : "border-[#0f2035]/10 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-[#0f2035] text-sm flex items-center gap-1.5">
                    {clip.title}
                    {clip.active && (
                      <span title="Used in live delivery sequence">
                        <Star size={12} className="text-[#e8b800] fill-[#e8b800]" />
                      </span>
                    )}
                  </p>
                  <p className="text-[#0f2035]/40 text-xs">
                    Story {clip.storyNumber} · Take {clip.take}
                    {clip.isFreeTrialEnd && (
                      <span className="ml-2 inline-flex items-center gap-1 text-blue-600">
                        <Flag size={10} /> End of free trial
                      </span>
                    )}
                    {clip.isChargeStart && (
                      <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                        <ArrowRightCircle size={10} /> First paid delivery
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <audio controls src={url} className="w-full h-9 mb-3" />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => send(clip.id, "bill")}
                  disabled={billStatus.state === "sending"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#0f2035] text-white px-3 py-1.5 rounded-full hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
                >
                  {billStatus.state === "sending" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Send size={12} />
                  )}
                  Send to Bill
                </button>
                <button
                  onClick={() => send(clip.id, "me")}
                  disabled={meStatus.state === "sending"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-3 py-1.5 rounded-full hover:bg-[#0f2035]/5 disabled:opacity-50 transition-colors"
                >
                  {meStatus.state === "sending" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Send size={12} />
                  )}
                  Send to Me
                </button>

                {billStatus.state === "sent" && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 size={12} /> Bill {billStatus.dryRun ? "(dry run)" : "sent"}
                  </span>
                )}
                {billStatus.state === "error" && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600">
                    <XCircle size={12} /> {billStatus.message}
                  </span>
                )}
                {meStatus.state === "sent" && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 size={12} /> Me {meStatus.dryRun ? "(dry run)" : "sent"}
                  </span>
                )}
                {meStatus.state === "error" && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600">
                    <XCircle size={12} /> {meStatus.message}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminTestPage() {
  const [secretInput, setSecretInput] = useState("");
  const [unlocked, setUnlocked] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  async function tryUnlock() {
    if (!secretInput) return;
    setUnlockError("");
    setUnlocking(true);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secretInput }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setUnlockError(data.error ?? "Incorrect passphrase");
        return;
      }
      setUnlocked(secretInput);
    } catch {
      setUnlockError("Network error. Please try again.");
    } finally {
      setUnlocking(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#fdf8ee] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white border border-[#0f2035]/10 rounded-2xl p-7 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#0f2035] flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-[#e8b800]" />
          </div>
          <h1 className="text-lg font-bold text-[#0f2035] mb-1">Admin Access</h1>
          <p className="text-[#0f2035]/50 text-sm mb-5">
            Enter the admin passphrase (<code className="text-xs">ADMIN_SECRET</code> from your
            server env) to review voice quality and send test deliveries.
          </p>
          <input
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void tryUnlock()}
            placeholder="Passphrase"
            className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] mb-3 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800]"
          />
          {unlockError && (
            <p className="text-red-500 text-xs mb-3 text-left">{unlockError}</p>
          )}
          <button
            onClick={() => void tryUnlock()}
            disabled={!secretInput || unlocking}
            className="w-full bg-[#e8b800] hover:bg-[#f5c842] disabled:opacity-50 text-[#0f2035] font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            {unlocking ? <Loader2 size={16} className="animate-spin" /> : null}
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8ee] px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-[#0f2035]">Voice Quality &amp; Delivery Test</h1>
          <p className="text-[#0f2035]/55 text-sm mt-1">
            Preview all 13 clips per voice and send real RVM test deliveries to Bill or yourself.
            The <Star size={12} className="inline text-[#e8b800] fill-[#e8b800] -mt-0.5" /> icon
            marks the take used in the live daily-delivery sequence.
          </p>
          <p className="text-[#0f2035]/35 text-xs mt-2">
            With <code>DRY_RUN=true</code>, sends are logged only — no voicemail is delivered.
            Set <code>DRY_RUN=false</code> in Vercel after credentials and a successful live test.
            Audio must be a public HTTPS URL (your deployed site + <code>/audio/...</code>).
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <VoiceColumn voice="male" secret={unlocked} />
          <VoiceColumn voice="female" secret={unlocked} />
        </div>
      </div>
    </div>
  );
}
