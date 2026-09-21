"use client";

/**
 * One subscriber's ops page — opened from the list so Manage has room to
 * breathe instead of stacking a panel over the table.
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Save,
  Send,
  UserX,
  XCircle,
} from "lucide-react";

type Testament = "old" | "new" | "both";
type Voice = "male" | "female";

interface PlanOption {
  id: string;
  name: string;
  frequency: number;
  monthlyPrice: number;
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  planId: string | null;
  frequency: number;
  voice: string;
  testament: string;
  trackKey: string;
  optedOut: boolean;
  lastDeliveredAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  stripeId: string;
  subscriptionId: string | null;
}

interface DeliveryRow {
  id: string;
  sentAt: string;
  ok: boolean;
  voice: string;
  providerStatus: number | null;
  error: string | null;
  clip: {
    id: string;
    take: number;
    label: string | null;
    role: string;
    story: { title: string; storyNumber: number; testament: string };
  };
}

interface DetailPayload {
  customer: CustomerDetail;
  deliveries: DeliveryRow[];
  deliveredOkCount: number;
  runway: { clipsLeft: number; daysLeft: number; frequency: number; trackKey: string };
  plans: PlanOption[];
  error?: string;
}

interface ClipOutcome {
  clipId: string;
  title: string;
  role: string;
  ok: boolean;
  dryRun: boolean;
  error?: string;
}

const STATUS_STYLES: Record<string, string> = {
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-[#0f2035]/5 text-[#0f2035]/50 border-[#0f2035]/15",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-[#0f2035]/5 text-[#0f2035]/60 border-[#0f2035]/15";
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${style}`}>
      {status}
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminSubscriberDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<ClipOutcome[] | null>(null);

  const [form, setForm] = useState({ name: "", email: "", phone: "", voice: "female" as Voice });
  const [testament, setTestament] = useState<Testament>("new");
  const [planId, setPlanId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      const payload = (await res.json()) as DetailPayload;
      if (!res.ok) throw new Error(payload.error ?? "Could not load subscriber");
      setDetail(payload);
      setForm({
        name: payload.customer.name,
        email: payload.customer.email,
        phone: payload.customer.phone,
        voice: payload.customer.voice === "male" ? "male" : "female",
      });
      setTestament((payload.customer.testament as Testament) ?? "new");
      setPlanId(payload.customer.planId ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load subscriber");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: string, extra: Record<string, unknown> = {}, label = action) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = (await res.json()) as DetailPayload & { ok?: boolean };
      if (!res.ok) throw new Error(payload.error ?? "Action failed");
      setDetail(payload);
      setNotice("Saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function runDelivery(isPreview: boolean) {
    const label = isPreview ? "preview" : "send";
    setBusy(label);
    setError("");
    setNotice("");
    setPreview(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: isPreview }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: { clips: ClipOutcome[]; sent: number; outOfContent: boolean };
      };
      if (!res.ok) throw new Error(payload.error ?? "Delivery failed");

      const clips = payload.result?.clips ?? [];
      setPreview(clips);
      if (!isPreview) {
        setNotice(`Sent ${payload.result?.sent ?? 0} clip(s).`);
        void load();
      } else if (clips.length === 0) {
        setNotice("Nothing queued — this subscriber is out of content on their track.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delivery failed");
    } finally {
      setBusy(null);
    }
  }

  const profileDirty =
    detail !== null &&
    (form.name !== detail.customer.name ||
      form.email !== detail.customer.email ||
      form.phone !== detail.customer.phone ||
      form.voice !== detail.customer.voice);

  return (
    <div className="px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-5">
          <Link
            href="/admin/subscribers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f2035]/55 hover:text-[#0f2035]"
          >
            <ArrowLeft size={12} /> Back to subscribers
          </Link>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0f2035] flex flex-wrap items-center gap-2">
              {loading ? "Loading…" : detail?.customer.name || "Subscriber"}
              {detail && <StatusBadge status={detail.customer.status} />}
            </h1>
            {detail && (
              <p className="text-[#0f2035]/55 text-sm mt-1">
                {detail.customer.email}
                {detail.customer.phone ? ` · ${detail.customer.phone}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-4 py-2 rounded-full inline-flex items-center gap-1.5 hover:bg-[#0f2035]/5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        </div>

        {error && (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm mb-4 inline-flex items-center gap-1.5">
            <CheckCircle2 size={13} /> {notice}
          </p>
        )}

        {loading && !detail && (
          <p className="text-[#0f2035]/40 text-sm flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading subscriber…
          </p>
        )}

        {detail && (
          <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-5">
            {detail.customer.optedOut && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <UserX size={15} className="text-red-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-red-700 font-semibold">
                    This subscriber sent STOP and is excluded from delivery.
                  </p>
                  <button
                    onClick={() => void act("clearOptOut", {}, "clearOptOut")}
                    disabled={busy !== null}
                    className="text-xs font-semibold text-red-700 underline mt-1 disabled:opacity-50"
                  >
                    Clear opt-out (only with their permission)
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#0f2035]/40 mb-2">
                  Contact &amp; voice
                </h3>
                <div className="space-y-2">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
                  />
                  <input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone"
                    className="w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
                  />
                  <select
                    value={form.voice}
                    onChange={(e) => setForm((f) => ({ ...f, voice: e.target.value as Voice }))}
                    className="w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
                  >
                    <option value="female">Female voice — Sarah</option>
                    <option value="male">Male voice — David</option>
                  </select>
                  <button
                    onClick={() => void act("updateProfile", form, "updateProfile")}
                    disabled={!profileDirty || busy !== null}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#0f2035] text-white px-4 py-2 rounded-full hover:bg-[#162d4a] disabled:opacity-40 transition-colors"
                  >
                    {busy === "updateProfile" ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    Save contact details
                  </button>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#0f2035]/40 mb-2">
                  Reading track &amp; plan
                </h3>
                <div className="space-y-2">
                  <select
                    value={testament}
                    onChange={(e) => {
                      const next = e.target.value as Testament;
                      setTestament(next);
                      void act("updateTrack", { testament: next }, "updateTrack");
                    }}
                    disabled={busy !== null}
                    className="w-full border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 disabled:opacity-50"
                  >
                    <option value="new">New Testament</option>
                    <option value="old">Old Testament</option>
                    <option value="both">Complete Bible</option>
                  </select>

                  <div className="flex gap-2">
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="flex-1 border border-[#0f2035]/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
                    >
                      <option value="">No plan on record</option>
                      {detail.plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} — {plan.frequency}x/day (${plan.monthlyPrice})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Change the plan in Stripe as well? This re-prices their subscription with prorations.",
                          )
                        ) {
                          void act("changePlan", { planId }, "changePlan");
                        }
                      }}
                      disabled={!planId || planId === detail.customer.planId || busy !== null}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-3 py-2 rounded-full hover:bg-[#0f2035]/5 disabled:opacity-40"
                    >
                      {busy === "changePlan" ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CreditCard size={12} />
                      )}
                      Move
                    </button>
                  </div>

                  <p className="text-[#0f2035]/45 text-xs">
                    Delivering {detail.runway.frequency}x/day · {detail.runway.clipsLeft} clips left (
                    {detail.runway.daysLeft} days) · {detail.deliveredOkCount} sent so far
                  </p>
                  <p className="text-[#0f2035]/35 text-xs">
                    Trial ends {formatDate(detail.customer.trialEndsAt)} · Last delivery{" "}
                    {formatDate(detail.customer.lastDeliveredAt)}
                  </p>
                </div>
              </section>
            </div>

            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[#0f2035]/10">
              {detail.customer.status === "paused" ? (
                <button
                  onClick={() => void act("resume", {}, "resume")}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#e8b800] text-[#0f2035] px-4 py-2 rounded-full hover:bg-[#f5c842] disabled:opacity-50"
                >
                  {busy === "resume" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Play size={12} />
                  )}
                  Resume delivery
                </button>
              ) : (
                <button
                  onClick={() => void act("pause", {}, "pause")}
                  disabled={busy !== null || detail.customer.status === "cancelled"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-4 py-2 rounded-full hover:bg-[#0f2035]/5 disabled:opacity-40"
                >
                  {busy === "pause" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Pause size={12} />
                  )}
                  Pause delivery
                </button>
              )}

              <button
                onClick={() => void runDelivery(true)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#0f2035]/20 text-[#0f2035] px-4 py-2 rounded-full hover:bg-[#0f2035]/5 disabled:opacity-40"
              >
                {busy === "preview" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Eye size={12} />
                )}
                Preview next
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Send this subscriber their next clip(s) now?")) {
                    void runDelivery(false);
                  }
                }}
                disabled={busy !== null || detail.customer.optedOut}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#0f2035] text-white px-4 py-2 rounded-full hover:bg-[#162d4a] disabled:opacity-40"
              >
                {busy === "send" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                Send next now
              </button>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Cancel this subscription at the end of the current billing period?",
                    )
                  ) {
                    void act("cancel", {}, "cancel");
                  }
                }}
                disabled={busy !== null || detail.customer.status === "cancelled"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-red-200 text-red-600 px-4 py-2 rounded-full hover:bg-red-50 disabled:opacity-40"
              >
                {busy === "cancel" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Ban size={12} />
                )}
                Cancel subscription
              </button>

              {detail.customer.stripeId && (
                <a
                  href={`https://dashboard.stripe.com/customers/${detail.customer.stripeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f2035]/60 px-4 py-2 rounded-full hover:bg-[#0f2035]/5"
                >
                  <ExternalLink size={12} /> Open in Stripe
                </a>
              )}
            </div>

            {preview && preview.length > 0 && (
              <div className="mt-4 bg-[#fdf8ee] border border-[#e8b800]/40 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#0f2035]/50 mb-2">
                  Next up
                </p>
                <ul className="space-y-1">
                  {preview.map((clip) => (
                    <li key={clip.clipId} className="text-sm text-[#0f2035] flex items-center gap-2">
                      {clip.ok ? (
                        <CheckCircle2 size={12} className="text-green-600 shrink-0" />
                      ) : (
                        <XCircle size={12} className="text-red-600 shrink-0" />
                      )}
                      {clip.title}
                      {clip.role !== "story" && (
                        <span className="text-[#0f2035]/40 text-xs">({clip.role})</span>
                      )}
                      {clip.error && <span className="text-red-600 text-xs">{clip.error}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#0f2035]/10">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#0f2035]/40 mb-2">
                Recent deliveries
              </h3>
              {detail.deliveries.length === 0 ? (
                <p className="text-[#0f2035]/40 text-sm">Nothing delivered yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {detail.deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-center gap-2 text-sm border-b border-[#0f2035]/5 pb-1.5 last:border-0"
                    >
                      {delivery.ok ? (
                        <CheckCircle2 size={12} className="text-green-600 shrink-0" />
                      ) : (
                        <XCircle size={12} className="text-red-600 shrink-0" />
                      )}
                      <span className="text-[#0f2035] truncate">
                        {delivery.clip.story.title}
                        {delivery.clip.label ? ` (${delivery.clip.label})` : ""}
                      </span>
                      <span className="text-[#0f2035]/35 text-xs ml-auto shrink-0">
                        {formatDateTime(delivery.sentAt)}
                      </span>
                      {delivery.error && (
                        <span className="text-red-600 text-xs shrink-0" title={delivery.error}>
                          failed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
