"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightCircle,
  CheckCircle2,
  Flag,
  Loader2,
  Send,
  Star,
  XCircle,
} from "lucide-react";

type Voice = "male" | "female";

type SendStatus =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; dryRun: boolean }
  | { state: "error"; message: string };

interface TestClip {
  id: string;
  storyNumber: number;
  storyTitle: string;
  testament: string;
  take: number;
  label: string | null;
  status: string;
  role: string;
  maleUrl: string | null;
  femaleUrl: string | null;
}

interface ContentResponse {
  stories: {
    testament: string;
    storyNumber: number;
    title: string;
    clips: {
      id: string;
      take: number;
      label: string | null;
      status: string;
      role: string;
      maleUrl: string | null;
      femaleUrl: string | null;
    }[];
  }[];
  error?: string;
}

/** Flattens the story list into the clip-per-row shape this page renders. */
function flatten(payload: ContentResponse): TestClip[] {
  return payload.stories.flatMap((story) =>
    story.clips.map((clip) => ({
      id: clip.id,
      storyNumber: story.storyNumber,
      storyTitle: story.title,
      testament: story.testament,
      take: clip.take,
      label: clip.label,
      status: clip.status,
      role: clip.role,
      maleUrl: clip.maleUrl,
      femaleUrl: clip.femaleUrl,
    })),
  );
}

function VoiceColumn({ voice, clips }: { voice: Voice; clips: TestClip[] }) {
  const [status, setStatus] = useState<Record<string, SendStatus>>({});

  async function send(clipId: string, recipient: "bill" | "me") {
    const key = `${clipId}:${recipient}`;
    setStatus((s) => ({ ...s, [key]: { state: "sending" } }));
    try {
      const res = await fetch("/api/admin/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, voice, clipId }),
      });
      const data = (await res.json()) as { ok?: boolean; dryRun?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus((s) => ({
          ...s,
          [key]: { state: "error", message: data.error ?? "Send failed" },
        }));
        return;
      }
      setStatus((s) => ({ ...s, [key]: { state: "sent", dryRun: !!data.dryRun } }));
    } catch {
      setStatus((s) => ({ ...s, [key]: { state: "error", message: "Network error" } }));
    }
  }

  const playable = clips.filter((clip) => (voice === "male" ? clip.maleUrl : clip.femaleUrl));

  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bold text-lg text-[#0f2035] mb-3 capitalize">
        {voice} voice — {voice === "male" ? "David" : "Sarah"}
        <span className="font-normal text-[#0f2035]/40 text-sm ml-2">({playable.length})</span>
      </h2>
      <div className="space-y-3">
        {playable.map((clip) => {
          const url = (voice === "male" ? clip.maleUrl : clip.femaleUrl) as string;
          const isLive = clip.status === "live";
          const billStatus = status[`${clip.id}:bill`] ?? { state: "idle" };
          const meStatus = status[`${clip.id}:me`] ?? { state: "idle" };

          return (
            <div
              key={clip.id}
              className={`border rounded-xl p-4 ${
                isLive ? "border-[#e8b800]/40 bg-[#e8b800]/5" : "border-[#0f2035]/10 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-[#0f2035] text-sm flex items-center gap-1.5">
                    {clip.storyTitle}
                    {clip.label ? ` (${clip.label})` : ""}
                    {isLive && (
                      <span title="Used in live delivery sequence">
                        <Star size={12} className="text-[#e8b800] fill-[#e8b800]" />
                      </span>
                    )}
                  </p>
                  <p className="text-[#0f2035]/40 text-xs">
                    {clip.testament === "old" ? "OT" : "NT"} story {clip.storyNumber} · Take{" "}
                    {clip.take}
                    {clip.role === "trialEnd" && (
                      <span className="ml-2 inline-flex items-center gap-1 text-blue-600">
                        <Flag size={10} /> End of free trial
                      </span>
                    )}
                    {clip.role === "chargeStart" && (
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
                  onClick={() => void send(clip.id, "bill")}
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
                  onClick={() => void send(clip.id, "me")}
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
  const [clips, setClips] = useState<TestClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content");
      const payload = (await res.json()) as ContentResponse;
      if (!res.ok) throw new Error(payload.error ?? "Could not load clips");
      setClips(flatten(payload));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load clips");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-[#0f2035]">
            Voice Quality &amp; Delivery Test
          </h1>
          <p className="text-[#0f2035]/55 text-sm mt-1">
            Preview every recorded clip per voice and send real RVM test deliveries to Bill or
            yourself. The{" "}
            <Star size={12} className="inline text-[#e8b800] fill-[#e8b800] -mt-0.5" /> icon marks
            clips that are live in the daily delivery sequence.
          </p>
          <p className="text-[#0f2035]/35 text-xs mt-2">
            With <code>DRY_RUN=true</code>, sends are logged only — no voicemail is delivered. Set{" "}
            <code>DRY_RUN=false</code> in Vercel after credentials and a successful live test.
            Test sends do not affect any customer&apos;s place in the sequence.
          </p>
        </div>

        {loading && (
          <p className="text-[#0f2035]/40 text-sm flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading clips…
          </p>
        )}

        {error && (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {!loading && !error && clips.length === 0 && (
          <p className="text-[#0f2035]/45 text-sm">
            No clips in the library yet. Add some in the{" "}
            <Link href="/admin/content" className="underline">
              story library
            </Link>
            .
          </p>
        )}

        {clips.length > 0 && (
          <div className="flex flex-col md:flex-row gap-8">
            <VoiceColumn voice="male" clips={clips} />
            <VoiceColumn voice="female" clips={clips} />
          </div>
        )}
      </div>
    </div>
  );
}
