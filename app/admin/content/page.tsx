"use client";

/**
 * Story Library. One job per tab so uploading, publishing, and ordering
 * don't compete for attention on a single scroll.
 */
import { useCallback, useEffect, useState } from "react";
import { ListOrdered, Library, Loader2, RefreshCw, Upload } from "lucide-react";
import AddStoryTab from "./_components/AddStoryTab";
import LibraryTab from "./_components/LibraryTab";
import OrderTab from "./_components/OrderTab";
import RunwayStrip from "./_components/RunwayStrip";
import SetupNotices from "./_components/SetupNotices";
import type { ContentPayload } from "./_components/shared";

type TabId = "library" | "add" | "order";

const TABS: { id: TabId; label: string; icon: typeof Library }[] = [
  { id: "library", label: "Library", icon: Library },
  { id: "add", label: "Add story", icon: Upload },
  { id: "order", label: "Playback order", icon: ListOrdered },
];

export default function AdminContentPage() {
  const [data, setData] = useState<ContentPayload | null>(null);
  const [tab, setTab] = useState<TabId>("library");
  const [testament, setTestament] = useState("");
  const [status, setStatus] = useState("");
  const [trackKey, setTrackKey] = useState("new");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ track: trackKey });
      if (testament) params.set("testament", testament);
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/content?${params}`);
      const payload = (await res.json()) as ContentPayload & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not load the story library");
      setData(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load the story library");
    } finally {
      setLoading(false);
    }
  }, [testament, status, trackKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0f2035]">Story Library</h1>
            <p className="text-[#0f2035]/55 text-sm mt-1">
              Add recordings, decide what is ready to send, and set the order subscribers hear
              them in.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-4 py-2 rounded-full inline-flex items-center gap-1.5 hover:bg-[#0f2035]/5 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Refresh
          </button>
        </div>

        {error && (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm mb-5">
            {error}
          </p>
        )}

        {data && (
          <>
            <SetupNotices
              storageConfigured={data.storageConfigured}
              legacyAudioCount={data.legacyAudioCount}
            />

            <RunwayStrip runways={data.runways} tightest={data.tightestSubscriber} />

            <div className="flex items-center gap-1 mb-5 border-b border-[#0f2035]/10">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 -mb-px border-b-2 transition-colors ${
                      active
                        ? "border-[#e8b800] text-[#0f2035]"
                        : "border-transparent text-[#0f2035]/45 hover:text-[#0f2035]/75"
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>

            {tab === "library" && (
              <LibraryTab
                stories={data.stories}
                limits={data.limits}
                storageConfigured={data.storageConfigured}
                testament={testament}
                status={status}
                onTestamentChange={setTestament}
                onStatusChange={setStatus}
                onChanged={() => void load()}
                onAddStory={() => setTab("add")}
              />
            )}

            {tab === "add" && (
              <AddStoryTab
                stories={data.stories}
                limits={data.limits}
                storageConfigured={data.storageConfigured}
                onSaved={(savedTestament) => {
                  setTestament(savedTestament);
                  setStatus("");
                  setTab("library");
                }}
              />
            )}

            {tab === "order" && (
              <OrderTab
                trackKey={data.trackKey}
                entries={data.trackOrder}
                onTrackChange={setTrackKey}
                onSaved={() => void load()}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
