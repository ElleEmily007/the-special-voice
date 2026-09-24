"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

type SessionPlan = {
  planId: string;
  planName: string;
  frequency: number;
  trialDays: number;
};

function OnboardingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");

  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    async function loadPlan() {
      setLoading(true);
      try {
        const res = await fetch(`/api/customer?sessionId=${encodeURIComponent(sessionId!)}`);
        const json = (await res.json()) as SessionPlan & { error?: unknown };
        if (!res.ok) {
          if (!cancelled) {
            setError(String(json.error ?? "Could not confirm your signup. Please contact support."));
          }
          return;
        }
        if (!cancelled) {
          setSessionPlan({
            planId: json.planId,
            planName: json.planName,
            frequency: json.frequency,
            trialDays: json.trialDays,
          });
        }
      } catch {
        if (!cancelled) setError("Network error confirming your signup.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPlan();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  if (loading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8ee]">
        <Loader2 size={32} className="animate-spin text-[#0f2035]" />
      </div>
    );
  }

  if (error || !sessionPlan) {
    return (
      <div className="min-h-screen bg-[#fdf8ee] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-red-600 text-sm mb-4">{error || "Could not confirm your signup."}</p>
          <a href="/" className="text-[#0f2035] underline text-sm">
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8ee] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#0f2035] mb-3">You&apos;re all set!</h1>
        <p className="text-[#0f2035]/60 mb-6 leading-relaxed">
          Your free trial of {sessionPlan.planName} starts today. Today&apos;s{" "}
          {sessionPlan.frequency === 1 ? "story is" : "stories are"} on the way to your voicemail.
          Welcome to The Special Voice!
        </p>
        <div className="bg-[#0f2035]/5 rounded-xl px-5 py-4 text-left mb-6 space-y-2 text-sm">
          <p className="text-[#0f2035]/50">What happens next:</p>
          <p className="text-[#0f2035]/75">
            ✓ {sessionPlan.frequency}{" "}
            {sessionPlan.frequency === 1 ? "story" : "stories"} a day during your{" "}
            {sessionPlan.trialDays}-day trial
          </p>
          <p className="text-[#0f2035]/75">✓ Today&apos;s voicemail is on its way</p>
          <p className="text-[#0f2035]/75">✓ The next ones arrive tomorrow</p>
          <p className="text-[#0f2035]/75">
            ✓ No charge until your {sessionPlan.trialDays}-day trial ends
          </p>
        </div>
        <a
          href="/"
          className="inline-block bg-[#e8b800] hover:bg-[#f5c842] text-[#0f2035] font-bold px-8 py-3 rounded-full transition-colors"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fdf8ee]">
          <Loader2 size={32} className="animate-spin text-[#0f2035]" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
