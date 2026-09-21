"use client";

/**
 * Three-step upload: which story, the recordings, then publish.
 *
 * Take, part label, and role are deliberately hidden behind "Advanced" —
 * almost every upload is take 1 of a plain story.
 */
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Settings2,
  Upload,
  XCircle,
} from "lucide-react";
import {
  type AdminStory,
  type ClipRole,
  type PendingFile,
  ROLE_LABELS,
  VOICE_NAMES,
  type Voice,
  formatBytes,
  formatSeconds,
  pickFile,
  storyCode,
  uploadVoice,
  warningsFor,
} from "./shared";

const STEPS = ["Which story", "Recordings", "Publish"] as const;

export default function AddStoryTab({
  stories,
  limits,
  storageConfigured,
  onSaved,
}: {
  stories: AdminStory[];
  limits: { maxBytes: number; maxSeconds: number };
  storageConfigured: boolean;
  onSaved: (testament: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [advanced, setAdvanced] = useState(false);

  const [testament, setTestament] = useState<"new" | "old">("new");
  const [storyNumber, setStoryNumber] = useState("");
  const [title, setTitle] = useState("");
  const [take, setTake] = useState("1");
  const [label, setLabel] = useState("");
  const [role, setRole] = useState<ClipRole>("story");

  const [male, setMale] = useState<PendingFile | null>(null);
  const [female, setFemale] = useState<PendingFile | null>(null);
  const [progress, setProgress] = useState<Record<Voice, number>>({ male: 0, female: 0 });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const maleInput = useRef<HTMLInputElement>(null);
  const femaleInput = useRef<HTMLInputElement>(null);

  /** Warn before an upload silently replaces an existing take. */
  const collision = useMemo(() => {
    const number = Number(storyNumber);
    if (!storyNumber.trim() || Number.isNaN(number)) return null;

    const story = stories.find(
      (candidate) => candidate.testament === testament && candidate.storyNumber === number,
    );
    if (!story) return null;

    const clip = story.clips.find((candidate) => candidate.take === (Number(take) || 1));
    return { story, clip };
  }, [stories, testament, storyNumber, take]);

  async function choose(voice: Voice, file: File | undefined) {
    if (!file) return;
    const next = await pickFile(file);
    const setter = voice === "male" ? setMale : setFemale;
    setter((previous) => {
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return next;
    });
  }

  function reset() {
    setStoryNumber("");
    setTitle("");
    setTake("1");
    setLabel("");
    setRole("story");
    if (male) URL.revokeObjectURL(male.previewUrl);
    if (female) URL.revokeObjectURL(female.previewUrl);
    setMale(null);
    setFemale(null);
    setProgress({ male: 0, female: 0 });
    if (maleInput.current) maleInput.current.value = "";
    if (femaleInput.current) femaleInput.current.value = "";
    setStep(0);
  }

  async function submit(makeReady: boolean) {
    setError("");
    setDone("");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        testament,
        storyNumber: Number(storyNumber),
        title: title.trim(),
        take: Number(take) || 1,
        label: label.trim() || null,
        role,
        status: makeReady ? "live" : "draft",
      };

      if (male) {
        payload.male = await uploadVoice("male", male, (percent) =>
          setProgress((p) => ({ ...p, male: percent })),
        );
      }
      if (female) {
        payload.female = await uploadVoice("female", female, (percent) =>
          setProgress((p) => ({ ...p, female: percent })),
        );
      }

      const res = await fetch("/api/admin/content/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not save the story");

      const saved = title.trim();
      const savedTestament = testament;
      reset();
      setDone(
        makeReady
          ? `Saved “${saved}” and added it to the delivery queue.`
          : `Saved “${saved}” as a draft. Make it ready when you want it sent.`,
      );
      onSaved(savedTestament);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const step1Valid = storyNumber.trim() !== "" && title.trim() !== "";
  const step2Valid = male !== null || female !== null;

  const filePicker = (voice: Voice) => {
    const pending = voice === "male" ? male : female;
    const inputRef = voice === "male" ? maleInput : femaleInput;
    const notes = warningsFor(pending, limits);

    return (
      <div className="border border-[#0f2035]/10 rounded-xl p-4">
        <p className="font-semibold text-sm text-[#0f2035] mb-1">{VOICE_NAMES[voice]}</p>
        <p className="text-[#0f2035]/40 text-xs mb-3 capitalize">{voice} voice</p>

        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
          onChange={(e) => void choose(voice, e.target.files?.[0])}
          className="w-full text-xs text-[#0f2035]/70 file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-[#0f2035] file:text-white file:text-xs file:font-semibold"
        />

        {pending && (
          <>
            <p className="text-[#0f2035]/50 text-xs mt-2">
              {formatBytes(pending.file.size)} · {formatSeconds(pending.seconds)}
            </p>
            <audio controls src={pending.previewUrl} className="w-full h-8 mt-2" />
            {notes.map((note) => (
              <p key={note} className="text-amber-700 text-xs mt-1 flex items-start gap-1">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {note}
              </p>
            ))}
            {busy && progress[voice] > 0 && (
              <div className="h-1.5 bg-[#0f2035]/10 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-[#e8b800] transition-all"
                  style={{ width: `${progress[voice]}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Upload size={16} className="text-[#0f2035]/50" />
        <h2 className="font-bold text-[#0f2035]">Add a story</h2>
      </div>
      <p className="text-[#0f2035]/45 text-xs mb-4">
        Upload one story at a time. You can add David now and Sarah later.
      </p>

      <div className="flex items-center gap-2 mb-5">
        {STEPS.map((name, index) => (
          <div key={name} className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                index === step
                  ? "bg-[#0f2035] text-white"
                  : index < step
                    ? "bg-[#e8b800]/20 text-[#8a6d00]"
                    : "bg-[#0f2035]/5 text-[#0f2035]/40"
              }`}
            >
              {index + 1}. {name}
            </span>
            {index < STEPS.length - 1 && <ArrowRight size={11} className="text-[#0f2035]/20" />}
          </div>
        ))}
      </div>

      {!storageConfigured && (
        <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs mb-4">
          Audio storage isn&apos;t switched on yet, so saving will fail. Ask your developer to
          finish the storage setup first.
        </p>
      )}

      {step === 0 && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-[#0f2035]">
              Which Bible
              <select
                value={testament}
                onChange={(e) => setTestament(e.target.value as "new" | "old")}
                className="mt-1 w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
              >
                <option value="new">New Testament</option>
                <option value="old">Old Testament</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-[#0f2035]">
              Story number
              <input
                type="number"
                min={0}
                value={storyNumber}
                onChange={(e) => setStoryNumber(e.target.value)}
                placeholder="6"
                className="mt-1 w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
              />
            </label>

            <label className="text-xs font-semibold text-[#0f2035] sm:col-span-1">
              Story title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Shepherds and the Angels"
                className="mt-1 w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
              />
            </label>
          </div>

          {collision?.story && (
            <p className="text-[#0f2035]/60 text-xs bg-[#fdf8ee] border border-[#e8b800]/40 rounded-xl px-3 py-2">
              {storyCode(testament, Number(storyNumber))} already exists as “
              {collision.story.title}”.
              {collision.clip
                ? " Saving will replace the recording already stored there."
                : " This will be added as another recording for that story."}
            </p>
          )}

          <button
            onClick={() => setAdvanced((v) => !v)}
            className="text-xs font-semibold text-[#0f2035]/50 inline-flex items-center gap-1 hover:text-[#0f2035]"
          >
            <Settings2 size={11} /> Advanced
          </button>

          {advanced && (
            <div className="grid gap-3 sm:grid-cols-3 pt-1">
              <label className="text-xs font-semibold text-[#0f2035]">
                Part label
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Part 2"
                  className="mt-1 w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
                />
              </label>
              <label className="text-xs font-semibold text-[#0f2035]">
                Version number
                <input
                  type="number"
                  min={1}
                  value={take}
                  onChange={(e) => setTake(e.target.value)}
                  className="mt-1 w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
                />
              </label>
              <label className="text-xs font-semibold text-[#0f2035]">
                Plays as
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as ClipRole)}
                  className="mt-1 w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
                >
                  {Object.entries(ROLE_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filePicker("male")}
          {filePicker("female")}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-[#fdf8ee] border border-[#0f2035]/10 rounded-xl p-4 text-sm">
            <p className="font-semibold text-[#0f2035]">
              {storyCode(testament, Number(storyNumber) || 0)} — {title.trim() || "Untitled"}
            </p>
            <p className="text-[#0f2035]/55 text-xs mt-1">
              {male ? "David ✓" : "David —"} · {female ? "Sarah ✓" : "Sarah —"}
              {label ? ` · ${label}` : ""}
              {role !== "story" ? ` · ${ROLE_LABELS[role]}` : ""}
            </p>
          </div>
          <p className="text-[#0f2035]/50 text-xs">
            Drafts are saved but never sent. Making it ready adds it to the end of the{" "}
            {testament === "old" ? "Old Testament" : "New Testament"} queue and the Complete Bible
            queue.
          </p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-xs mt-4 flex items-start gap-1">
          <XCircle size={12} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {done && (
        <p className="text-green-700 text-xs mt-4 flex items-center gap-1">
          <CheckCircle2 size={12} /> {done}
        </p>
      )}

      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#0f2035]/10">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={busy}
            className="text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-4 py-2 rounded-full inline-flex items-center gap-1.5 hover:bg-[#0f2035]/5 disabled:opacity-50"
          >
            <ArrowLeft size={12} /> Back
          </button>
        )}

        {step < 2 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !step1Valid) || (step === 1 && !step2Valid)}
            className="text-xs font-semibold bg-[#0f2035] text-white px-4 py-2 rounded-full inline-flex items-center gap-1.5 hover:bg-[#162d4a] disabled:opacity-40 ml-auto"
          >
            Next <ArrowRight size={12} />
          </button>
        )}

        {step === 2 && (
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              onClick={() => void submit(false)}
              disabled={busy}
              className="text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-4 py-2 rounded-full inline-flex items-center gap-1.5 hover:bg-[#0f2035]/5 disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : null}
              Save as draft
            </button>
            <button
              onClick={() => void submit(true)}
              disabled={busy}
              className="text-xs font-bold bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] px-5 py-2 rounded-full inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Save &amp; make ready
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
