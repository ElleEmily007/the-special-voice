"use client";

/**
 * Chrome shared by every /admin page: one passphrase gate, one nav.
 *
 * The gate is UX only — the API routes each call requireAdmin, so the session
 * cookie is still what actually authorises data access. Children are rendered
 * only once unlocked so a page never paints behind the gate.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, LayoutGrid, Library, Loader2, Lock, LogOut, Users } from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Home", icon: LayoutGrid },
  { href: "/admin/subscribers", label: "Subscribers", icon: Users },
  { href: "/admin/content", label: "Story library", icon: Library },
  { href: "/admin/test", label: "Voice test", icon: Headphones },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function PassphraseGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function tryUnlock() {
    if (!secret) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Incorrect passphrase");
        return;
      }
      onUnlocked();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf8ee] flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white border border-[#0f2035]/10 rounded-2xl p-7 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-[#0f2035] flex items-center justify-center mx-auto mb-4">
          <Lock size={20} className="text-[#e8b800]" />
        </div>
        <h1 className="text-lg font-bold text-[#0f2035] mb-1">The Special Voice — Admin</h1>
        <p className="text-[#0f2035]/50 text-sm mb-5">
          Enter the admin passphrase (<code className="text-xs">ADMIN_SECRET</code> from your
          server env) to manage subscribers, content, and test deliveries.
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void tryUnlock()}
          placeholder="Passphrase"
          className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] mb-3 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800]"
        />
        {error && <p className="text-red-500 text-xs mb-3 text-left">{error}</p>}
        <button
          onClick={() => void tryUnlock()}
          disabled={!secret || submitting}
          className="w-full bg-[#e8b800] hover:bg-[#f5c842] disabled:opacity-50 text-[#0f2035] font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          Unlock
        </button>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/admin/verify")
      .then((res) => setUnlocked(res.ok))
      .catch(() => setUnlocked(false))
      .finally(() => setChecking(false));
  }, []);

  const lock = useCallback(async () => {
    await fetch("/api/admin/verify", { method: "DELETE" }).catch(() => {});
    setUnlocked(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#fdf8ee] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#0f2035]/40" />
      </div>
    );
  }

  if (!unlocked) return <PassphraseGate onUnlocked={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-[#fdf8ee]">
      <header className="border-b border-[#0f2035]/10 bg-white/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/admin" className="font-extrabold text-[#0f2035] text-sm shrink-0">
            The Special Voice <span className="text-[#0f2035]/40 font-semibold">Admin</span>
          </Link>

          <nav className="flex items-center gap-1 flex-wrap">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    active
                      ? "bg-[#0f2035] text-white"
                      : "text-[#0f2035]/70 hover:bg-[#0f2035]/5"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => void lock()}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f2035]/60 hover:text-[#0f2035] px-3 py-1.5 rounded-full hover:bg-[#0f2035]/5 transition-colors"
          >
            <LogOut size={12} /> Lock
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
