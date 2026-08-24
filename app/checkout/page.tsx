"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Zap, ChevronLeft, Loader2 } from "lucide-react";
import { PLANS } from "@/lib/plans";

function CheckoutContent() {
  const params = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState(params.get("plan") ?? "twice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const plan = params.get("plan");
    if (plan) setSelectedPlan(plan);
  }, [params]);

  async function handleCheckout() {
    setLoading(true);
    setError("");
    try {
      const email = params.get("email") ?? undefined;
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan, email }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const activePlan = PLANS.find((p) => p.id === selectedPlan) ?? PLANS[1];
  const price = activePlan.monthlyPrice;

  return (
    <div className="min-h-screen bg-[#fdf8ee] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[#0f2035]/50 hover:text-[#0f2035] text-sm mb-8 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to home
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Plan selector */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-[#0f2035]">Choose Your Plan</h1>
              <p className="text-[#0f2035]/55 text-sm mt-1">
                Free trial length depends on your plan: 9 days (1/day), 6 days (2/day), or 3 days
                (3/day). Card required — first charge after the trial ends.
              </p>
            </div>

            {/* Plan cards */}
            <div className="space-y-3">
              {PLANS.map((plan) => {
                const active = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all ${
                      active
                        ? "border-[#e8b800] bg-[#e8b800]/8"
                        : "border-[#0f2035]/12 bg-white hover:border-[#0f2035]/25"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            active
                              ? "border-[#e8b800] bg-[#e8b800]"
                              : "border-[#0f2035]/25"
                          }`}
                        >
                          {active && <Check size={11} className="text-[#0f2035] font-black" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0f2035]">{plan.name}</span>
                            {plan.highlight && (
                              <span className="text-[10px] font-black bg-[#e8b800] text-[#0f2035] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Zap size={9} className="fill-current" /> Popular
                              </span>
                            )}
                          </div>
                          <span className="text-[#0f2035]/50 text-xs">
                            {plan.frequency}x/day &nbsp;·&nbsp; {plan.description}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[#0f2035]">${plan.monthlyPrice.toFixed(2)}</span>
                        <span className="text-[#0f2035]/40 text-xs">/mo</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-[#0f2035] rounded-2xl p-6 sticky top-6 text-white">
              <h2 className="font-bold text-lg mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-white/60">{activePlan.name}</span>
                  <span>${price.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/15 pt-3 flex justify-between font-bold">
                  <span>Total after trial</span>
                  <span className="text-[#e8b800]">${price.toFixed(2)}/mo</span>
                </div>
              </div>

              <div className="bg-green-500/15 border border-green-500/30 rounded-lg px-4 py-3 text-xs text-green-400 mb-5">
                <span className="font-semibold">{activePlan.trialDays}-day free trial</span> at{" "}
                {activePlan.frequency}x/day — a card is required to start, but you won&apos;t be
                charged until day {activePlan.trialDays + 1}.
              </div>

              {error && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3 text-xs text-red-400 mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-[#e8b800] hover:bg-[#f5c842] disabled:opacity-60 text-[#0f2035] font-bold py-3.5 rounded-full transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Redirecting to Stripe…
                  </>
                ) : (
                  "Continue to Secure Checkout"
                )}
              </button>

              <p className="text-white/35 text-xs text-center mt-3">
                Secured by Stripe &nbsp;·&nbsp; Cancel anytime
              </p>

              {/* Feature list */}
              <ul className="mt-5 space-y-2">
                {activePlan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-white/55">
                    <Check size={12} className="text-[#e8b800] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8ee]">
        <Loader2 size={32} className="animate-spin text-[#0f2035]" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
