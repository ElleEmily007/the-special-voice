"use client";

/**
 * Browse what has been recorded, publish it, and fill in a missing voice.
 */
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  type AdminClip,
  type AdminStory,
  type ClipRole,
  type PendingFile,
  RoleBadge,
  ROLE_LABELS,
  StatusBadge,
  TRACK_NAMES,
  VOICE_NAMES,
  type Voice,
  formatBytes,
  formatSeconds,
  pickFile,
  statusLabel,
  storyCode,
  uploadVoice,
  warningsFor,
} from "./shared";

interface Limits {
  maxBytes: number;
  maxSeconds: number;
}

function VoicePanel({
  voice,
  clip,
  story,
  limits,
  storageConfigured,
  onChanged,
}: {
  voice: Voice;
  clip: AdminClip;
  story: AdminStory;
  limits: Limits;
  storageConfigured: boolean;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const url = voice === "male" ? clip.maleUrl : clip.femaleUrl;
  const bytes = voice === "male" ? clip.maleBytes : clip.femaleBytes;
  const seconds = voice === "male" ? clip.maleSeconds : clip.femaleSeconds;
  const notes = warningsFor(pending, limits);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError("");
    const next = await pickFile(file);
    setPending((previous) => {
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return next;
    });
  }

  function cancel() {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setProgress(0);
    if (input.current) input.current.value = "";
  }

  /** Re-saves the clip with only this voice filled in; the other is untouched. */
  async function save() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const audio = await uploadVoice(voice, pending, setProgress);

      const res = await fetch("/api/admin/content/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testament: story.testament,
          storyNumber: story.storyNumber,
          title: story.title,
          take: clip.take,
          label: clip.label,
          role: clip.role,
          status: clip.status,
          [voice]: audio,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not save the recording");

      cancel();
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save the recording");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-[#0f2035]/10 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-[#0f2035] flex items-center gap-1.5">
          {url ? (
            <Check size={12} className="text-green-600" />
          ) : (
            <X size={12} className="text-[#0f2035]/30" />
          )}
          {VOICE_NAMES[voice]}
          <span className="font-normal text-[#0f2035]/35 capitalize">({voice})</span>
        </p>
        {url && (
          <span className="text-[11px] text-[#0f2035]/40">
            {formatBytes(bytes)} · {formatSeconds(seconds)}
          </span>
        )}
      </div>

      {url ? (
        <audio controls src={url} className="w-full h-8" />
      ) : (
        <p className="text-[11px] text-[#0f2035]/45 mb-2">No recording yet.</p>
      )}

      {pending ? (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-[#0f2035]/55">
            {pending.file.name} · {formatBytes(pending.file.size)} ·{" "}
            {formatSeconds(pending.seconds)}
          </p>
          <audio controls src={pending.previewUrl} className="w-full h-8" />
          {notes.map((note) => (
            <p key={note} className="text-amber-700 text-[11px] flex items-start gap-1">
              <AlertTriangle size={10} className="mt-0.5 shrink-0" /> {note}
            </p>
          ))}
          {busy && progress > 0 && (
            <div className="h-1.5 bg-[#0f2035]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#e8b800] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={busy}
              className="text-[11px] font-semibold bg-[#0f2035] text-white px-3 py-1 rounded-full inline-flex items-center gap-1 hover:bg-[#162d4a] disabled:opacity-50"
            >
              {busy ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
              {url ? "Replace recording" : "Save recording"}
            </button>
            <button
              onClick={cancel}
              disabled={busy}
              className="text-[11px] font-semibold border border-[#0f2035]/20 px-3 py-1 rounded-full hover:bg-[#0f2035]/5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <input
            ref={input}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
            disabled={!storageConfigured}
            onChange={(e) => void choose(e.target.files?.[0])}
            className="hidden"
          />
          <button
            onClick={() => input.current?.click()}
            disabled={!storageConfigured}
            className="text-[11px] font-semibold border border-[#0f2035]/20 text-[#0f2035] px-3 py-1 rounded-full inline-flex items-center gap-1 hover:bg-[#0f2035]/5 disabled:opacity-40"
          >
            <Upload size={10} /> {url ? `Replace ${VOICE_NAMES[voice]}` : `Add ${VOICE_NAMES[voice]}`}
          </button>
        </div>
      )}

      {error && <p className="text-red-600 text-[11px] mt-2">{error}</p>}
    </div>
  );
}

function ClipCard({
  clip,
  story,
  limits,
  storageConfigured,
  onChanged,
}: {
  clip: AdminClip;
  story: AdminStory;
  limits: Limits;
  storageConfigured: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/content/clips/${clip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Update failed");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this recording? The audio file itself stays in storage.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/content/clips/${clip.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Delete failed");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const hasAudio = Boolean(clip.maleUrl || clip.femaleUrl);

  return (
    <div className="border border-[#0f2035]/10 rounded-xl p-3 bg-white">
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <StatusBadge status={clip.status} />
        <RoleBadge role={clip.role} />
        {clip.label && <span className="text-sm text-[#0f2035]">{clip.label}</span>}
        {clip.take > 1 && !clip.label && (
          <span className="text-xs text-[#0f2035]/45">Version {clip.take}</span>
        )}
        {clip.deliveredCount > 0 && (
          <span className="text-[11px] text-[#0f2035]/40">
            sent {clip.deliveredCount} time{clip.deliveredCount === 1 ? "" : "s"}
          </span>
        )}
        {busy && <Loader2 size={12} className="animate-spin text-[#0f2035]/40" />}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 mb-2.5">
        {(["male", "female"] as Voice[]).map((voice) => (
          <VoicePanel
            key={voice}
            voice={voice}
            clip={clip}
            story={story}
            limits={limits}
            storageConfigured={storageConfigured}
            onChanged={onChanged}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {clip.status !== "live" && (
          <button
            onClick={() => {
              if (!hasAudio) {
                setError("Add at least one recording before making this ready to send.");
                return;
              }
              void patch({ status: "live" });
            }}
            disabled={busy}
            className="text-xs font-semibold bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] px-3 py-1 rounded-full disabled:opacity-50"
          >
            Make ready to send
          </button>
        )}
        {clip.status === "live" && (
          <button
            onClick={() => void patch({ status: "draft" })}
            disabled={busy}
            className="text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-3 py-1 rounded-full hover:bg-[#0f2035]/5 disabled:opacity-50"
          >
            Move back to draft
          </button>
        )}
        {clip.status !== "retired" && (
          <button
            onClick={() => void patch({ status: "retired" })}
            disabled={busy}
            className="text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035]/70 px-3 py-1 rounded-full hover:bg-[#0f2035]/5 disabled:opacity-50"
          >
            Archive
          </button>
        )}

        <button
          onClick={() => setAdvanced((v) => !v)}
          className="text-xs font-semibold text-[#0f2035]/50 px-2 py-1 rounded-full hover:bg-[#0f2035]/5 inline-flex items-center gap-1 ml-auto"
        >
          <Settings2 size={11} /> Advanced
        </button>
      </div>

      {advanced && (
        <div className="mt-3 pt-3 border-t border-[#0f2035]/10 flex flex-wrap items-center gap-2">
          <label className="text-xs text-[#0f2035]/60">
            Plays as
            <select
              value={clip.role}
              onChange={(e) => void patch({ role: e.target.value as ClipRole })}
              disabled={busy}
              className="ml-2 text-xs border border-[#0f2035]/15 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <span className="text-[11px] text-[#0f2035]/40">
            Version {clip.take}
            {clip.positions.length > 0 &&
              ` · ${clip.positions
                .map((p) => `${TRACK_NAMES[p.trackKey] ?? p.trackKey} #${p.position + 1}`)
                .join(", ")}`}
          </span>

          {clip.deliveredCount === 0 && (
            <button
              onClick={() => void remove()}
              disabled={busy}
              className="text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-full px-3 py-1 inline-flex items-center gap-1 disabled:opacity-50 ml-auto"
            >
              <Trash2 size={11} /> Delete
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  );
}

function StoryGroup({
  story,
  limits,
  storageConfigured,
  defaultOpen,
  onChanged,
}: {
  story: AdminStory;
  limits: Limits;
  storageConfigured: boolean;
  defaultOpen: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const summary = useMemo(() => {
    const ready = story.clips.filter((clip) => clip.status === "live").length;
    const hasMale = story.clips.some((clip) => clip.maleUrl);
    const hasFemale = story.clips.some((clip) => clip.femaleUrl);
    return { ready, hasMale, hasFemale };
  }, [story.clips]);

  return (
    <div className="border border-[#0f2035]/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#fdf8ee]/70 transition-colors"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown size={14} className="text-[#0f2035]/40 shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-[#0f2035]/40 shrink-0" />
        )}
        <span className="font-mono text-xs text-[#0f2035]/35 shrink-0">
          {storyCode(story.testament, story.storyNumber)}
        </span>
        <span className="font-semibold text-[#0f2035] truncate">{story.title}</span>

        <span className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-[#0f2035]/45">
            {summary.hasMale ? "David ✓" : "David —"} · {summary.hasFemale ? "Sarah ✓" : "Sarah —"}
          </span>
          <span className="text-[11px] text-[#0f2035]/40">
            {story.clips.length} recording{story.clips.length === 1 ? "" : "s"}
            {summary.ready > 0 ? `, ${summary.ready} ready` : ""}
          </span>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {story.clips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              story={story}
              limits={limits}
              storageConfigured={storageConfigured}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryTab({
  stories,
  limits,
  storageConfigured,
  testament,
  status,
  onTestamentChange,
  onStatusChange,
  onChanged,
  onAddStory,
}: {
  stories: AdminStory[];
  limits: Limits;
  storageConfigured: boolean;
  testament: string;
  status: string;
  onTestamentChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onChanged: () => void;
  onAddStory: () => void;
}) {
  return (
    <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-[#0f2035]">
          Stories{" "}
          <span className="font-normal text-[#0f2035]/40 text-sm">({stories.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={testament}
            onChange={(e) => onTestamentChange(e.target.value)}
            className="text-xs border border-[#0f2035]/15 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
          >
            <option value="">Whole Bible</option>
            <option value="new">New Testament</option>
            <option value="old">Old Testament</option>
          </select>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-xs border border-[#0f2035]/15 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
          >
            <option value="">All recordings</option>
            <option value="live">{statusLabel("live")} to send</option>
            <option value="draft">{statusLabel("draft")}</option>
            <option value="retired">{statusLabel("retired")}</option>
          </select>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#0f2035]/45 text-sm mb-3">
            Nothing here yet with these filters.
          </p>
          <button
            onClick={onAddStory}
            className="text-xs font-semibold bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] px-4 py-2 rounded-full"
          >
            Add a story
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {stories.map((story) => (
            <StoryGroup
              key={story.id}
              story={story}
              limits={limits}
              storageConfigured={storageConfigured}
              defaultOpen={stories.length === 1}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}
