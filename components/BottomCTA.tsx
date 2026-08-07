import Link from "next/link";
import { Play } from "lucide-react";

export default function BottomCTA() {
  return (
    <section className="gradient-navy py-20 px-4 text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
          Ready to Make the Bible{" "}
          <span className="text-gradient-gold">Part of Your Day?</span>
        </h2>
        <p className="text-white/60 mb-8 leading-relaxed">
          Start your free 10-day trial today. A card is required to start, but you won&apos;t be
          charged until day 11. Just open your voicemail and let the story come to you.
        </p>
        <Link
          href="/optin"
          className="inline-flex items-center gap-2 bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] font-bold text-lg px-10 py-4 rounded-full shadow-lg shadow-[#e8b800]/20 transition-all hover:shadow-[#e8b800]/40 hover:-translate-y-0.5"
        >
          <Play size={18} className="fill-current" />
          Start Free for 10 Days
        </Link>
        <p className="text-white/35 text-xs mt-4">
          Plans start at $12.95/month after trial &nbsp;·&nbsp; Cancel anytime
        </p>
      </div>
    </section>
  );
}
