import { MousePointerClick, Settings2, PhoneIncoming } from "lucide-react";

const steps = [
  {
    icon: MousePointerClick,
    step: "1",
    title: "Choose Your Plan",
    description:
      "Pick how many stories you want each day — 1, 2, or 3. Your free trial matches that plan: 9 days at 1/day, 6 days at 2/day, or 3 days at 3/day (card required; no charge until the trial ends).",
  },
  {
    icon: Settings2,
    step: "2",
    title: "Set Up Your Preferences",
    description:
      "Tell us your phone number, pick a male or female voice, and choose Old Testament, New Testament, or both.",
  },
  {
    icon: PhoneIncoming,
    step: "3",
    title: "Stories Arrive Daily",
    description:
      "Each day, a warm, story-driven Bible reading lands gently in your voicemail. No ring, no interruption — just press play when you're ready.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#fdf8ee] py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[#e8b800] font-semibold uppercase tracking-widest text-xs">
            Simple as 1-2-3
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2035] mt-2">
            How The Special Voice Works
          </h2>
          <p className="text-[#0f2035]/60 mt-3 max-w-xl mx-auto">
            We handle everything. You just press play.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ icon: Icon, step, title, description }) => (
            <div
              key={step}
              className="relative bg-white border border-[#0f2035]/8 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Step badge */}
              <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-[#e8b800] flex items-center justify-center text-[#0f2035] font-black text-sm shadow">
                {step}
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#0f2035]/5 flex items-center justify-center mb-4 mt-2">
                <Icon size={24} className="text-[#0f2035]" />
              </div>
              <h3 className="text-[#0f2035] font-bold text-xl mb-2">{title}</h3>
              <p className="text-[#0f2035]/60 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "2 Voices", label: "Choose male or female narration" },
            { value: "3–9 Days", label: "Free trial length depends on your plan" },
            { value: "3 Plans", label: "From 1 to 3 stories a day" },
            { value: "2", label: "Old & New Testament to choose from" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-black text-[#0f2035]">{value}</div>
              <div className="text-[#0f2035]/55 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
