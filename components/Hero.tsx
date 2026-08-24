import Link from "next/link";
import { PhoneCall, Star, Play } from "lucide-react";

export default function Hero() {
  return (
    <section className="gradient-navy min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-1/4 left-[-10%] w-96 h-96 rounded-full bg-[#e8b800]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-[-10%] w-80 h-80 rounded-full bg-[#e8b800]/8 blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 bg-[#e8b800]/15 border border-[#e8b800]/30 text-[#f5c842] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
          <PhoneCall size={12} />
          Ringless Voicemail Bible Delivery
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
          Hear the Bible.{" "}
          <span className="text-gradient-gold">Every Day.</span>
          <br />
          <span className="text-white/90 text-3xl sm:text-4xl md:text-5xl font-bold">
            Delivered Straight to Your Voicemail.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
          Warm, engaging Bible stories narrated with joy and care — sent directly
          to your phone as a voicemail. No app to download. No schedule to keep.
          Just press play and let the Word come to you.
        </p>

        {/* Social proof stars */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={18} className="fill-[#e8b800] text-[#e8b800]" />
          ))}
          <span className="text-white/60 text-sm ml-2">Loved by families across the country</span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/optin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] font-bold text-lg px-8 py-4 rounded-full shadow-lg shadow-[#e8b800]/20 transition-all hover:shadow-[#e8b800]/40 hover:-translate-y-0.5"
          >
            <Play size={18} className="fill-current" />
            Start Free Trial
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/25 text-white/90 hover:border-white/50 hover:text-white font-semibold text-base px-8 py-4 rounded-full transition-all"
          >
            See How It Works
          </a>
        </div>

        {/* Trust micro-copy */}
        <p className="text-white/40 text-sm">
          Card required to start &nbsp;·&nbsp; Trial length by plan (9 / 6 / 3 days) &nbsp;·&nbsp;
          Plans from $12.95/mo
        </p>

        {/* Voicemail visual mockup */}
        <div className="mt-14 flex justify-center">
          <div className="bg-white/8 backdrop-blur border border-white/15 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-xl max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-[#e8b800]/20 flex items-center justify-center flex-shrink-0">
              <PhoneCall size={22} className="text-[#e8b800]" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-semibold">New Voicemail</p>
              <p className="text-white/50 text-xs">The Special Voice &nbsp;·&nbsp; 2 min 14 sec</p>
              <p className="text-white/40 text-xs mt-0.5 italic">&ldquo;In the beginning God created…&rdquo;</p>
            </div>
            <div className="ml-auto">
              <div className="w-9 h-9 rounded-full bg-[#e8b800] flex items-center justify-center">
                <Play size={14} className="fill-[#0f2035] text-[#0f2035] ml-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
