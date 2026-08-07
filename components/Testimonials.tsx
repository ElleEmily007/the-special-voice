import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Martha R.",
    location: "Tennessee",
    stars: 5,
    text: "I drive 45 minutes to work each morning. Now I spend that time listening to a Bible story in the most peaceful, warm voice. It's become the highlight of my commute.",
  },
  {
    name: "James & Carol D.",
    location: "Georgia",
    stars: 5,
    text: "We play The Special Voice at dinner for the kids. They actually ask to hear it! We've gotten through half of Genesis together in just a few weeks.",
  },
  {
    name: "Pastor Mike T.",
    location: "Alabama",
    stars: 5,
    text: "I recommend it to my congregation who struggle to maintain a daily Bible reading habit. This removes every excuse. It just shows up for you.",
  },
  {
    name: "Susan K.",
    location: "Ohio",
    stars: 5,
    text: "I'm legally blind, so audio delivery is a blessing. The narration is so warm and clear — it feels like someone is telling me the story personally.",
  },
  {
    name: "David L.",
    location: "Florida",
    stars: 5,
    text: "Been a subscriber for 8 months. Just crossed into the New Testament. At this rate I'll finish the whole Bible — something I've wanted to do my entire life.",
  },
  {
    name: "Linda & Bob H.",
    location: "Kentucky",
    stars: 5,
    text: "We upgraded to 3x a day after the first month. It's become a family ritual, and my husband loves that he can pick the male voice while I prefer the female one.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#fdf8ee] py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[#e8b800] font-semibold uppercase tracking-widest text-xs">
            Real Subscribers
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2035] mt-2">
            Families Across America Are Listening
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map(({ name, location, stars, text }) => (
            <div
              key={name}
              className="bg-white border border-[#0f2035]/8 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
            >
              <Quote size={28} className="text-[#e8b800]/30 absolute top-5 right-5" />
              <div className="flex gap-0.5 mb-3">
                {[...Array(stars)].map((_, i) => (
                  <Star key={i} size={14} className="fill-[#e8b800] text-[#e8b800]" />
                ))}
              </div>
              <p className="text-[#0f2035]/75 text-sm leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
              <div>
                <p className="text-[#0f2035] font-semibold text-sm">{name}</p>
                <p className="text-[#0f2035]/45 text-xs">{location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
