"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Loader2, Ban } from "lucide-react";

const schema = z.object({
  phone: z
    .string()
    .min(10, "Enter a valid US phone number")
    .regex(/^\+?[\d\s\-().]{10,}$/, "Invalid phone number format"),
});

type FormData = z.infer<typeof schema>;

export default function StopPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      const res = await fetch("/api/optout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok) {
        setServerError(String(json.error ?? "Something went wrong. Please try again."));
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Network error. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fdf8ee] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0f2035] mb-3">
            You&apos;ve been unsubscribed
          </h1>
          <p className="text-[#0f2035]/60 mb-6 leading-relaxed">
            You will no longer receive ringless voicemails or multi-media messages from
            Cleveribility, LLC / The Special Voice. If this was a mistake, please contact support.
          </p>
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

  return (
    <div className="min-h-screen bg-[#fdf8ee] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#0f2035] flex items-center justify-center mx-auto mb-4">
            <Ban size={24} className="text-[#e8b800]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0f2035]">
            Unsubscribe / Stop Messages
          </h1>
          <p className="text-[#0f2035]/55 text-sm mt-2 leading-relaxed">
            Enter the cell phone number that receives messages from The Special Voice. We will stop
            all ringless voicemails and multi-media messages to that number.
          </p>
        </div>

        <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-7 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-1.5">
                Cell phone number
              </label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="(555) 867-5309"
                autoComplete="tel"
                className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] placeholder-[#0f2035]/30 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800] transition-all"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0f2035] hover:bg-[#162d4a] disabled:opacity-60 text-white font-bold py-3.5 rounded-full transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing…
                </>
              ) : (
                "Stop Messages"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
