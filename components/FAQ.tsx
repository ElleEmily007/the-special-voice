"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What exactly is a ringless voicemail?",
    a: "A ringless voicemail (RVM) is a recording delivered directly to your voicemail inbox — your phone never rings. You'll see a new voicemail notification, and you can listen at any time that's convenient for you. It's completely non-intrusive.",
  },
  {
    q: "Do I need to download an app?",
    a: "Not at all. Stories are delivered to the voicemail you already have on your phone. No downloads, no accounts to log into.",
  },
  {
    q: "What's the difference between the plans?",
    a: "All plans deliver the same stories — the difference is frequency. Once Daily sends 1 story/day, Twice Daily sends 2/day, and Three Times Daily sends 3/day.",
  },
  {
    q: "Can I choose a male or female voice?",
    a: "Yes! During sign-up you'll choose between a male voice (David) or a female voice (Sarah). You can preview both before deciding.",
  },
  {
    q: "Can I choose Old or New Testament?",
    a: "Yes! During sign-up you'll choose whether you want to start with the Old Testament, the New Testament, or receive both together. You can update your preference anytime from your account portal.",
  },
  {
    q: "How does the free trial work?",
    a: "You get 10 days of daily stories, starting at 1 per day. A card is required to start the trial, but you will not be charged until day 11. If you cancel before then, you won't be billed at all.",
  },
  {
    q: "Can I pause or cancel?",
    a: "Yes, anytime. Log in to your account portal to pause deliveries, change your plan, or cancel. There are no cancellation fees and no long-term contracts.",
  },
  {
    q: "Is this affiliated with a specific church or denomination?",
    a: "The Special Voice is non-denominational. We deliver the stories of the Bible as written, narrated with warmth and care, for Christians of all backgrounds and traditions.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-[#0f2035] py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[#e8b800] font-semibold uppercase tracking-widest text-xs">
            Questions &amp; Answers
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            Everything You Need to Know
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <div
              key={i}
              className="bg-white/6 border border-white/12 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={open === i}
              >
                <span className="text-white font-semibold text-sm sm:text-base">{q}</span>
                <ChevronDown
                  size={18}
                  className={`flex-shrink-0 text-[#e8b800] mt-0.5 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-white/60 text-sm leading-relaxed">{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
