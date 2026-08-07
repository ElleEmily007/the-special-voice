"use client";
import { useState } from "react";
import Link from "next/link";
import {
  PhoneCall,
  Mic,
  Settings,
  ExternalLink,
  Loader2,
  BookOpen,
  Clock,
  AlertCircle,
} from "lucide-react";
import { PLANS } from "@/lib/plans";

type Customer = {
  id: string;
  stripeId: string;
  name: string;
  email: string;
  phone: string;
  voice: string;
  testament: string;
  frequency: number;
  planId: string | null;
  status: string;
  subscriptionId: string | null;
  createdAt: string;
};

export default function PortalPage() {
  const [email, setEmail] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  async function lookupCustomer() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customer?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json() as { customer: Customer };
        setCustomer(data.customer);
      } else {
        setError("No account found for that email address.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function openBillingPortal() {
    if (!customer) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeId: customer.stripeId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Could not open billing portal.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  const plan = PLANS.find(
    (p) =>
      customer?.frequency === p.frequency ||
      customer?.planId?.includes(p.id)
  );

  const statusColor: Record<string, string> = {
    trial: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    active: "bg-green-500/15 text-green-400 border-green-500/25",
    paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
  };

  const testamentLabel: Record<string, string> = {
    new: "New Testament",
    old: "Old Testament",
    both: "Old & New Testament",
  };

  return (
    <div className="min-h-screen bg-[#fdf8ee]">
      {/* Header */}
      <header className="bg-[#0f2035] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-lg">
            The <span className="text-gradient-gold">Special Voice</span>
          </Link>
          <span className="text-white/50 text-sm">My Account</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {!customer ? (
          /* Email lookup */
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#0f2035] flex items-center justify-center mx-auto mb-6">
              <Settings size={24} className="text-[#e8b800]" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#0f2035] mb-2">My Account</h1>
            <p className="text-[#0f2035]/55 mb-8">
              Enter your email address to access your account.
            </p>

            <div className="max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                placeholder="your@email.com"
                className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] placeholder-[#0f2035]/30 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800] transition-all mb-3"
              />
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm mb-3">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              <button
                onClick={lookupCustomer}
                disabled={loading || !email.trim()}
                className="w-full bg-[#0f2035] hover:bg-[#162d4a] disabled:opacity-50 text-white font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Looking up…
                  </>
                ) : (
                  "Access My Account"
                )}
              </button>
              <p className="text-[#0f2035]/40 text-xs mt-4">
                Don&apos;t have an account?{" "}
                <Link href="/checkout" className="text-[#0f2035] underline">
                  Start your free trial
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* Account dashboard */
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-[#0f2035]">
                  Welcome back, {customer.name.split(" ")[0]}!
                </h1>
                <p className="text-[#0f2035]/45 text-sm">{customer.email}</p>
              </div>
              <span
                className={`text-xs font-semibold border px-3 py-1 rounded-full capitalize ${
                  statusColor[customer.status] ?? "bg-gray-100 text-gray-500"
                }`}
              >
                {customer.status}
              </span>
            </div>

            {/* Current plan card */}
            <div className="bg-[#0f2035] rounded-2xl p-6 text-white">
              <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Current Plan</p>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{plan?.name ?? "Custom Plan"}</h2>
                  <p className="text-white/50 text-sm mt-1">
                    {customer.frequency}x/day delivery
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-[#e8b800] text-lg">
                    ${plan?.monthlyPrice.toFixed(2)}/mo
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white/8 rounded-xl p-3 flex items-center gap-2">
                  <BookOpen size={16} className="text-[#e8b800]" />
                  <div>
                    <p className="text-white text-xs font-semibold">
                      {testamentLabel[customer.testament] ?? customer.testament}
                    </p>
                    <p className="text-white/40 text-[10px]">Testament</p>
                  </div>
                </div>
                <div className="bg-white/8 rounded-xl p-3 flex items-center gap-2">
                  <Clock size={16} className="text-[#e8b800]" />
                  <div>
                    <p className="text-white text-xs font-semibold">
                      {customer.frequency}x per day
                    </p>
                    <p className="text-white/40 text-[10px]">Delivery frequency</p>
                  </div>
                </div>
                <div className="bg-white/8 rounded-xl p-3 flex items-center gap-2">
                  <PhoneCall size={16} className="text-[#e8b800]" />
                  <div>
                    <p className="text-white text-xs font-semibold">{customer.phone}</p>
                    <p className="text-white/40 text-[10px]">Delivery phone</p>
                  </div>
                </div>
                <div className="bg-white/8 rounded-xl p-3 flex items-center gap-2">
                  <Mic size={16} className="text-[#e8b800]" />
                  <div>
                    <p className="text-white text-xs font-semibold capitalize">
                      {customer.voice === "male" ? "Male (David)" : "Female (Sarah)"}
                    </p>
                    <p className="text-white/40 text-[10px]">Voice</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Manage billing */}
            <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-6">
              <h3 className="font-bold text-[#0f2035] mb-1">Manage Subscription</h3>
              <p className="text-[#0f2035]/50 text-sm mb-4">
                Upgrade, downgrade, update your payment method, or cancel — all through
                Stripe&apos;s secure billing portal.
              </p>
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm mb-3">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 bg-[#0f2035] hover:bg-[#162d4a] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
              >
                {portalLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ExternalLink size={15} />
                )}
                Open Billing Portal
              </button>
            </div>

            {/* Sign out */}
            <button
              onClick={() => { setCustomer(null); setEmail(""); }}
              className="text-[#0f2035]/40 text-sm hover:text-[#0f2035] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
