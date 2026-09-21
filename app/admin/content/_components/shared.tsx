"use client";

/**
 * Types, wording, and upload plumbing shared by the Story Library tabs.
 *
 * The database speaks live/draft/retired and male/female. Everything an
 * operator reads says Ready/Draft/Archived and David/Sarah, so the mapping
 * lives here rather than being repeated in each tab.
 */
import { ArrowRightCircle, Flag, Star } from "lucide-react";

export type Voice = "male" | "female";
export type ClipStatus = "draft" | "live" | "retired";
export type ClipRole = "story" | "welcome" | "trialEnd" | "chargeStart";

export interface AdminClip {
  id: string;
  take: number;
  label: string | null;
  status: string;
  role: string;
  maleUrl: string | null;
  femaleUrl: string | null;
  maleBytes: number | null;
  femaleBytes: number | null;
  maleSeconds: number | null;
  femaleSeconds: number | null;
  positions: { trackKey: string; position: number }[];
  deliveredCount: number;
}

export interface AdminStory {
  id: string;
  testament: string;
  storyNumber: number;
  title: string;
  clips: AdminClip[];
}

export interface TrackRunway {
  trackKey: string;
  name: string;
  liveClips: number;
  draftClips: number;
  days: { once: number; twice: number; thrice: number };
}

export interface SubscriberRunway {
  customerId: string;
  name: string;
  trackKey: string;
  frequency: number;
  clipsLeft: number;
  daysLeft: number;
}

export interface TrackOrderEntry {
  clipId: string;
  position: number;
  status: string;
  role: string;
  storyNumber: number;
  storyTitle: string;
  take: number;
  label: string | null;
}

export interface ContentPayload {
  stories: AdminStory[];
  runways: TrackRunway[];
  tightestSubscriber: SubscriberRunway | null;
  trackKey: string;
  trackOrder: TrackOrderEntry[];
  storageConfigured: boolean;
  legacyAudioCount: number;
  limits: { maxBytes: number; maxSeconds: number };
}

export const VOICE_NAMES: Record<Voice, string> = { male: "David", female: "Sarah" };

export const STATUS_LABELS: Record<string, string> = {
  live: "Ready",
  draft: "Draft",
  retired: "Archived",
};

export const STATUS_STYLES: Record<string, string> = {
  live: "bg-[#e8b800]/15 text-[#8a6d00] border-[#e8b800]/40",
  draft: "bg-[#0f2035]/5 text-[#0f2035]/60 border-[#0f2035]/15",
  retired: "bg-red-50 text-red-600 border-red-200",
};

export const TRACK_NAMES: Record<string, string> = {
  new: "New Testament",
  old: "Old Testament",
  both: "Complete Bible",
};

export const ROLE_LABELS: Record<string, string> = {
  story: "Story",
  welcome: "Welcome",
  trialEnd: "End of free trial",
  chargeStart: "First paid delivery",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function storyCode(testament: string, storyNumber: number): string {
  return `${testament === "old" ? "OT" : "NT"} ${String(storyNumber).padStart(3, "0")}`;
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatSeconds(seconds: number | null): string {
  if (!seconds) return "—";
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

/** "about 3 weeks" reads better than "21d" on a page John and Bill scan. */
export function describeDays(days: number): string {
  if (days <= 0) return "none left";
  if (days === 1) return "about 1 day";
  if (days < 14) return `about ${days} days`;
  const weeks = Math.floor(days / 7);
  if (weeks < 9) return `about ${weeks} weeks`;
  const months = Math.floor(days / 30);
  return `about ${months} month${months === 1 ? "" : "s"}`;
}

export function contentTypeFor(file: File): string {
  if (file.type === "audio/mpeg" || file.type === "audio/mp3") return "audio/mpeg";
  if (file.type === "audio/wav" || file.type === "audio/x-wav") return "audio/wav";
  return file.name.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg";
}

/** Reads the clip length in the browser so it can be stored alongside the file. */
export function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.addEventListener("loadedmetadata", () =>
      done(Number.isFinite(audio.duration) ? audio.duration : null),
    );
    audio.addEventListener("error", () => done(null));
    audio.src = url;
  });
}

/** PUT straight to the bucket, reporting progress as it goes. */
export function uploadToBucket(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else
        reject(
          new Error(
            `The storage bucket rejected this upload (error ${xhr.status}). Ask your developer to check the bucket's CORS rules.`,
          ),
        );
    });
    xhr.addEventListener("error", () =>
      reject(
        new Error("Upload failed before it finished. Ask your developer to check the bucket setup."),
      ),
    );
    xhr.send(file);
  });
}

export interface PendingFile {
  file: File;
  seconds: number | null;
  /** Created once per pick so re-renders don't leak blob URLs. */
  previewUrl: string;
}

export async function pickFile(file: File): Promise<PendingFile> {
  const seconds = await readDuration(file);
  return { file, seconds, previewUrl: URL.createObjectURL(file) };
}

export interface UploadedAudio {
  url: string;
  bytes: number;
  seconds?: number;
}

/** Presigns, uploads to the bucket, and returns what the clip API expects. */
export async function uploadVoice(
  voice: Voice,
  pending: PendingFile,
  onProgress: (percent: number) => void,
): Promise<UploadedAudio> {
  const contentType = contentTypeFor(pending.file);

  const presignRes = await fetch("/api/admin/content/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voice, filename: pending.file.name, contentType }),
  });
  const presign = (await presignRes.json()) as {
    uploadUrl?: string;
    publicUrl?: string;
    error?: string;
  };
  if (!presignRes.ok || !presign.uploadUrl || !presign.publicUrl) {
    throw new Error(presign.error ?? "Could not start the upload");
  }

  await uploadToBucket(presign.uploadUrl, pending.file, contentType, onProgress);

  return {
    url: presign.publicUrl,
    bytes: pending.file.size,
    ...(pending.seconds !== null ? { seconds: pending.seconds } : {}),
  };
}

export function warningsFor(
  pending: PendingFile | null,
  limits: { maxBytes: number; maxSeconds: number },
): string[] {
  if (!pending) return [];
  const notes: string[] = [];
  if (pending.file.size > limits.maxBytes) {
    notes.push(`${formatBytes(pending.file.size)} is larger than the 1 MB guideline`);
  }
  if (pending.seconds !== null && pending.seconds > limits.maxSeconds) {
    notes.push(`${formatSeconds(pending.seconds)} is longer than the 60 second guideline`);
  }
  return notes;
}

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? STATUS_STYLES.draft}>{statusLabel(status)}</Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  if (role === "trialEnd") {
    return (
      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
        <Flag size={10} /> End of trial
      </Badge>
    );
  }
  if (role === "chargeStart") {
    return (
      <Badge className="bg-green-50 text-green-700 border-green-200">
        <ArrowRightCircle size={10} /> First paid
      </Badge>
    );
  }
  if (role === "welcome") {
    return (
      <Badge className="bg-purple-50 text-purple-700 border-purple-200">
        <Star size={10} /> Welcome
      </Badge>
    );
  }
  return null;
}
