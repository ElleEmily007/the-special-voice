"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Operator-facing warnings about the storage cutover.
 *
 * Deliberately free of environment variable names — John and Bill can't act
 * on those, and the fix in both cases is the same phone call.
 */
export default function SetupNotices({
  storageConfigured,
  legacyAudioCount,
}: {
  storageConfigured: boolean;
  legacyAudioCount: number;
}) {
  if (storageConfigured && legacyAudioCount === 0) return null;

  return (
    <div className="space-y-3 mb-5">
      {!storageConfigured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-700 mt-0.5 shrink-0" />
          <p className="text-amber-900 text-sm">
            <span className="font-semibold">Audio storage isn&apos;t switched on yet.</span> You can
            still browse and edit stories, but new recordings can&apos;t be uploaded until your
            developer finishes the storage setup.
          </p>
        </div>
      )}

      {legacyAudioCount > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-700 mt-0.5 shrink-0" />
          <p className="text-amber-900 text-sm">
            <span className="font-semibold">
              {legacyAudioCount} recording{legacyAudioCount === 1 ? "" : "s"} still play from the
              website instead of storage.
            </span>{" "}
            These are the original clips from before the move. Ask your developer to run the
            one-time import so every recording is served from storage.
          </p>
        </div>
      )}
    </div>
  );
}
