import SectionBackdrop from "./SectionBackdrop";

const steps = [
  {
    step: "01",
    title: "Tell us how to reach you",
    description:
      "Share your name, email, and cell number. Choose a male or female voice, and select the Old Testament, the New Testament, or both.",
  },
  {
    step: "02",
    title: "Choose your plan",
    description:
      "Decide how many stories you want each day: one, two, or three. The free trial follows that plan — 9 days, 6 days, or 3 days. A card is required to start, and you are not charged until the trial ends.",
  },
  {
    step: "03",
    title: "Listen when you are ready",
    description:
      "Each day, a warm Bible story arrives in your voicemail. Your phone does not ring. Open the message and press play whenever it suits you.",
  },
];

const notes = [
  "Male or female narration",
  "One, two, or three stories a day",
  "A free trial of 9, 6, or 3 days",
  "Old Testament, New Testament, or both",
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-[#fdf8ee] py-24 px-4">
      <SectionBackdrop tone="cream" />
      <div className="relative z-10 max-w-5xl mx-auto grid gap-12 lg:grid-cols-12 lg:gap-16 lg:items-start">
        <div className="lg:col-span-4">
          <p className="text-[#c99e00] text-xs font-semibold uppercase tracking-[0.22em]">
            How it works
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-[#0f2035] leading-tight">
            A daily reading, without a new habit to keep.
          </h2>
          <p className="mt-4 text-[#0f2035]/70 leading-relaxed">
            You set it up once. We send a story to the voicemail you already have.
          </p>
          <ul className="mt-8 space-y-3">
            {notes.map((note) => (
              <li key={note} className="flex gap-3 text-sm text-[#0f2035]/75">
                <span className="mt-2 h-px w-4 shrink-0 bg-[#e8b800]" aria-hidden />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <ol className="lg:col-span-8 border-t border-[#0f2035]/12">
          {steps.map(({ step, title, description }) => (
            <li
              key={step}
              className="grid grid-cols-[3.25rem_1fr] gap-4 border-b border-[#0f2035]/12 py-8 sm:grid-cols-[4.5rem_1fr] sm:gap-6"
            >
              <span className="text-sm font-medium tracking-[0.18em] text-[#c99e00] pt-1">
                {step}
              </span>
              <div>
                <h3 className="text-xl font-semibold text-[#0f2035]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0f2035]/70">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
