import Link from "next/link";
import { Headphones, Library, Users } from "lucide-react";

const TOOLS = [
  {
    href: "/admin/subscribers",
    icon: Users,
    title: "Subscribers",
    body: "Look up a subscriber, fix their phone or voice, change their plan, pause or cancel delivery, and see everything they have been sent.",
  },
  {
    href: "/admin/content",
    icon: Library,
    title: "Story library",
    body: "Upload the male and female take of a story, publish or retire clips, set the delivery order, and watch the content runway.",
  },
  {
    href: "/admin/test",
    icon: Headphones,
    title: "Voice test",
    body: "Play any recorded clip and send a real test voicemail to Bill or yourself without touching a subscriber's place in the sequence.",
  },
] as const;

export default function AdminHomePage() {
  return (
    <div className="px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold text-[#0f2035]">Admin</h1>
        <p className="text-[#0f2035]/55 text-sm mt-1 mb-8 max-w-2xl">
          Everything needed to run The Special Voice day to day. Content and subscriber changes
          here take effect on the next delivery run — no deploy required.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ href, icon: Icon, title, body }) => (
            <Link
              key={href}
              href={href}
              className="bg-white border border-[#0f2035]/10 rounded-2xl p-5 hover:border-[#e8b800] hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-[#0f2035] flex items-center justify-center mb-3 group-hover:bg-[#162d4a] transition-colors">
                <Icon size={18} className="text-[#e8b800]" />
              </div>
              <h2 className="font-bold text-[#0f2035] mb-1">{title}</h2>
              <p className="text-[#0f2035]/55 text-sm leading-relaxed">{body}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
