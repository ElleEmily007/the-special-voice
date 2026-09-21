"use client";

/**
 * Subscriber list: search, filter, then open Manage on its own page.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  UserX,
} from "lucide-react";

interface CustomerRow {
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
}

interface ListPayload {
  customers: CustomerRow[];
  total: number;
  page: number;
  pages: number;
  summary: Record<string, number>;
  error?: string;
}

const STATUS_STYLES: Record<string, string> = {
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-[#0f2035]/5 text-[#0f2035]/50 border-[#0f2035]/15",
};

const SUMMARY_ORDER = ["trial", "active", "paused", "cancelled", "optedOut"] as const;
const SUMMARY_LABELS: Record<string, string> = {
  trial: "Trial",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  optedOut: "Opted out",
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

export default function AdminSubscribersPage() {
  const [data, setData] = useState<ListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set("q", query);
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/customers?${params}`);
      const payload = (await res.json()) as ListPayload;
      if (!res.ok) throw new Error(payload.error ?? "Could not load subscribers");
      setData(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load subscribers");
    } finally {
      setLoading(false);
    }
  }, [query, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0f2035]">Subscribers</h1>
            <p className="text-[#0f2035]/55 text-sm mt-1">
              Look someone up, then open Manage to fix details, move their plan, or pause delivery.
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
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </p>
        )}

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {SUMMARY_ORDER.map((key) => (
              <div
                key={key}
                className="bg-white border border-[#0f2035]/10 rounded-2xl px-4 py-3 text-center"
              >
                <p className="text-2xl font-extrabold text-[#0f2035]">{data.summary[key] ?? 0}</p>
                <p className="text-[#0f2035]/45 text-xs font-semibold">{SUMMARY_LABELS[key]}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2035]/30"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setQuery(search);
                  }
                }}
                placeholder="Search name, email, or phone — then press Enter"
                className="w-full border border-[#0f2035]/15 rounded-full pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
              />
            </div>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="text-xs border border-[#0f2035]/15 rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50"
            >
              <option value="">All statuses</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading && !data ? (
            <p className="text-[#0f2035]/40 text-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading subscribers…
            </p>
          ) : data && data.customers.length === 0 ? (
            <p className="text-[#0f2035]/40 text-sm">No subscribers match these filters yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#0f2035]/40 text-xs uppercase tracking-wide">
                    <th className="pb-2 font-bold">Name</th>
                    <th className="pb-2 font-bold">Contact</th>
                    <th className="pb-2 font-bold">Status</th>
                    <th className="pb-2 font-bold">Plan</th>
                    <th className="pb-2 font-bold">Last sent</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {data?.customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-t border-[#0f2035]/5 hover:bg-[#fdf8ee]/60"
                    >
                      <td className="py-2.5 pr-3">
                        <span className="font-semibold text-[#0f2035]">{customer.name || "—"}</span>
                        {customer.optedOut && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-red-600">
                            <UserX size={10} /> STOP
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-[#0f2035]/60 text-xs">
                        <div className="truncate max-w-[180px]">{customer.email}</div>
                        <div>{customer.phone}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={customer.status} />
                      </td>
                      <td className="py-2.5 pr-3 text-[#0f2035]/60 text-xs">
                        {customer.planId ?? "—"}
                        <span className="text-[#0f2035]/35"> · {customer.frequency}x</span>
                      </td>
                      <td className="py-2.5 pr-3 text-[#0f2035]/50 text-xs">
                        {formatDate(customer.lastDeliveredAt)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link
                          href={`/admin/subscribers/${customer.id}`}
                          className="text-xs font-semibold text-[#0f2035] border border-[#0f2035]/20 px-3 py-1 rounded-full hover:bg-[#0f2035]/5"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#0f2035]/10">
              <p className="text-[#0f2035]/40 text-xs">
                Page {data.page} of {data.pages} · {data.total} subscribers
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="text-xs font-semibold border border-[#0f2035]/20 px-3 py-1.5 rounded-full disabled:opacity-40 hover:bg-[#0f2035]/5"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page >= data.pages}
                  className="text-xs font-semibold border border-[#0f2035]/20 px-3 py-1.5 rounded-full disabled:opacity-40 hover:bg-[#0f2035]/5"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
