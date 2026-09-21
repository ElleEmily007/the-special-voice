"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { describeDays, type SubscriberRunway, type TrackRunway } from "./shared";

/**
 * How much recorded content is left, in days rather than clip counts, since
 * "about 3 weeks" is the number worth acting on.
 */
export default function RunwayStrip({
  runways,
  tightest,
}: {
  runways: TrackRunway[];
  tightest: SubscriberRunway | null;
}) {
  const low = tightest !== null && tightest.daysLeft <= 3;

  return (
    <div
      className={`rounded-2xl border p-4 mb-5 ${
        low ? "bg-red-50 border-red-200" : "bg-white border-[#0f2035]/10"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {low ? (
          <AlertTriangle size={15} className="text-red-600" />
        ) : (
          <Clock size={15} className="text-[#0f2035]/50" />
        )}
        <h2 className="font-bold text-[#0f2035] text-sm">How much content is left</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {runways.map((runway) => (
          <div key={runway.trackKey} className="border border-[#0f2035]/10 rounded-xl p-3 bg-white">
            <p className="font-semibold text-sm text-[#0f2035]">{runway.name}</p>
            <p className="text-[#0f2035]/70 text-xs mt-1">
              {describeDays(runway.days.once)} at once a day
            </p>
            <p className="text-[#0f2035]/45 text-xs mt-0.5">
              {describeDays(runway.days.twice)} at twice · {describeDays(runway.days.thrice)} at
              three times
            </p>
            <p className="text-[#0f2035]/35 text-xs mt-1.5">
              {runway.liveClips} ready
              {runway.draftClips > 0 ? ` · ${runway.draftClips} still draft` : ""}
            </p>
          </div>
        ))}
      </div>

      {tightest ? (
        <p className={`text-xs mt-3 ${low ? "text-red-700 font-semibold" : "text-[#0f2035]/55"}`}>
          {low ? "Running out: " : "Closest to running out: "}
          {tightest.name} has {describeDays(tightest.daysLeft)} of recordings left.
        </p>
      ) : (
        <p className="text-xs mt-3 text-[#0f2035]/45">No subscribers are receiving stories yet.</p>
      )}
    </div>
  );
}
