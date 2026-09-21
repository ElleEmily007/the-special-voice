"use client";

/**
 * The order subscribers hear stories in. Supports drag as well as arrow
 * buttons, since drag is awkward on a laptop trackpad.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Loader2, Save } from "lucide-react";
import {
  RoleBadge,
  StatusBadge,
  TRACK_NAMES,
  type TrackOrderEntry,
  statusLabel,
} from "./shared";

export default function OrderTab({
  trackKey,
  entries,
  onTrackChange,
  onSaved,
}: {
  trackKey: string;
  entries: TrackOrderEntry[];
  onTrackChange: (key: string) => void;
  onSaved: () => void;
}) {
  const [order, setOrder] = useState<TrackOrderEntry[]>(entries);
  const [dragging, setDragging] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setOrder(entries), [entries]);

  const dirty = useMemo(
    () => order.some((entry, index) => entry.clipId !== entries[index]?.clipId),
    [order, entries],
  );

  const readyCount = useMemo(
    () => order.filter((entry) => entry.status === "live").length,
    [order],
  );

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= order.length) return;
    setOrder((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackKey, clipIds: order.map((entry) => entry.clipId) }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not save the new order");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save the new order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="font-bold text-[#0f2035]">Playback order</h2>
        <div className="flex items-center gap-2">
          <select
            value={trackKey}
            onChange={(e) => onTrackChange(e.target.value)}
            className="text-xs border border-[#0f2035]/15 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
          >
            {Object.entries(TRACK_NAMES).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void save()}
            disabled={!dirty || saving}
            className="text-xs font-semibold bg-[#0f2035] hover:bg-[#162d4a] text-white px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Save order
          </button>
        </div>
      </div>

      <p className="text-[#0f2035]/45 text-xs mb-4">
        The order {TRACK_NAMES[trackKey] ?? trackKey} subscribers hear stories in — {readyCount}{" "}
        ready to send. Existing subscribers keep their place, so nothing repeats and nothing is
        skipped.
      </p>

      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      {order.length === 0 ? (
        <p className="text-[#0f2035]/40 text-sm">Nothing has been added to this queue yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {order.map((entry, index) => {
            const ready = entry.status === "live";
            return (
              <li
                key={entry.clipId}
                draggable
                onDragStart={() => setDragging(index)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragging !== null && dragging !== index) {
                    move(dragging, index);
                    setDragging(index);
                  }
                }}
                className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${
                  dragging === index ? "border-[#e8b800] shadow-sm" : "border-[#0f2035]/10"
                } ${ready ? "bg-white" : "bg-[#0f2035]/[0.03]"}`}
              >
                <GripVertical size={13} className="text-[#0f2035]/25 shrink-0 cursor-grab" />
                <span className="text-xs font-mono text-[#0f2035]/35 w-7 shrink-0">
                  {index + 1}
                </span>

                <span
                  className={`text-sm truncate ${ready ? "text-[#0f2035]" : "text-[#0f2035]/45"}`}
                >
                  {entry.storyTitle}
                  {entry.label
                    ? ` (${entry.label})`
                    : entry.take > 1
                      ? ` — version ${entry.take}`
                      : ""}
                </span>

                {!ready && (
                  <span className="shrink-0 flex items-center gap-1.5">
                    <StatusBadge status={entry.status} />
                    <span className="text-[11px] text-[#0f2035]/40 hidden sm:inline">
                      won&apos;t send while {statusLabel(entry.status).toLowerCase()}
                    </span>
                  </span>
                )}
                <RoleBadge role={entry.role} />

                <span className="ml-auto flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label="Move earlier"
                    className="p-1 rounded-full text-[#0f2035]/40 hover:bg-[#0f2035]/5 hover:text-[#0f2035] disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(index, index + 1)}
                    disabled={index === order.length - 1}
                    aria-label="Move later"
                    className="p-1 rounded-full text-[#0f2035]/40 hover:bg-[#0f2035]/5 hover:text-[#0f2035] disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronDown size={14} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
