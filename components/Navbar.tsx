"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f2035]/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">
            The <span className="text-gradient-gold">Special Voice</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          <Link href="/portal" className="hover:text-white transition-colors">My Account</Link>
        </nav>

        <Link
          href="/optin"
          className="hidden md:inline-flex items-center gap-1 bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] font-semibold text-sm px-4 py-2 rounded-full transition-colors"
        >
          Start Free Trial
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0f2035] border-t border-white/10 px-4 pb-4 flex flex-col gap-4 text-white/80">
          <a href="#how-it-works" onClick={() => setOpen(false)} className="pt-3 hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" onClick={() => setOpen(false)} className="hover:text-white transition-colors">FAQ</a>
          <Link href="/portal" onClick={() => setOpen(false)} className="hover:text-white transition-colors">My Account</Link>
          <Link
            href="/optin"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] font-semibold text-sm px-4 py-2 rounded-full transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      )}
    </header>
  );
}
