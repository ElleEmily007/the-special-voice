import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { PLANS } from "@/lib/plans";

export default function PricingTable() {
  return (
    <section id="pricing" className="bg-[#0f2035] py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[#e8b800] font-semibold uppercase tracking-widest text-xs">
            Simple Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            Choose Your Daily Rhythm
          </h2>
          <p className="text-white/55 mt-3 max-w-xl mx-auto">
            Free trial length depends on your plan. You receive stories at your plan&apos;s
            frequency from day one.
          </p>
        </div>

        {/* Free trial callout */}
        <div className="mb-8 bg-[#e8b800]/10 border border-[#e8b800]/25 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-white font-semibold">Not sure yet? Try it free first.</p>
            <p className="text-white/55 text-sm">
              9 days (1/day), 6 days (2/day), or 3 days (3/day). A card is required to start — you
              won&apos;t be charged until the trial ends.
            </p>
          </div>
          <Link
            href="/optin?plan=once"
            className="flex-shrink-0 bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] font-bold text-sm px-6 py-2.5 rounded-full transition-colors"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-7 flex flex-col ${
                  plan.highlight
                    ? "bg-[#e8b800] text-[#0f2035] ring-4 ring-[#e8b800]/30 shadow-xl shadow-[#e8b800]/20"
                    : "bg-white/8 border border-white/15 text-white"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#0f2035] text-[#e8b800] text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full flex items-center gap-1">
                      <Zap size={11} className="fill-current" /> Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p
                    className={`font-black text-xl ${
                      plan.highlight ? "text-[#0f2035]" : "text-white"
                    }`}
                  >
                    {plan.name}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      plan.highlight ? "text-[#0f2035]/70" : "text-white/55"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <div className="mb-5">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black">${plan.monthlyPrice.toFixed(2)}</span>
                    <span
                      className={`text-sm mb-1 ${
                        plan.highlight ? "text-[#0f2035]/60" : "text-white/50"
                      }`}
                    >
                      /mo
                    </span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check
                        size={15}
                        className={`flex-shrink-0 mt-0.5 ${
                          plan.highlight ? "text-[#0f2035]" : "text-[#e8b800]"
                        }`}
                      />
                      <span className={plan.highlight ? "text-[#0f2035]/80" : "text-white/75"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/optin?plan=${plan.id}`}
                  className={`block text-center font-bold py-3 rounded-full transition-all ${
                    plan.highlight
                      ? "bg-[#0f2035] text-white hover:bg-[#162d4a]"
                      : "bg-[#e8b800] text-[#0f2035] hover:bg-[#f5c842]"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
