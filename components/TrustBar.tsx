import { ShieldCheck, BookOpen, Heart, PhoneOff, Clock } from "lucide-react";

const items = [
  { icon: ShieldCheck, label: "Secure Payment" },
  { icon: BookOpen, label: "Bible-Based Content" },
  { icon: Heart, label: "Family Friendly" },
  { icon: PhoneOff, label: "No App Required" },
  { icon: Clock, label: "Cancel Anytime" },
];

export default function TrustBar() {
  return (
    <section className="bg-[#0f2035] border-y border-white/10 py-6">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {items.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-white/60 text-sm">
              <Icon size={16} className="text-[#e8b800]" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
