"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Loader2, PhoneCall } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .min(10, "Enter a valid US phone number")
    .regex(/^\+?[\d\s\-().]{10,}$/, "Invalid phone number format"),
  consent: z.boolean().refine((v) => v === true, { message: "You must agree to continue" }),
});

type FormData = z.infer<typeof schema>;

function OptInContent() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { consent: false },
  });

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      const res = await fetch("/api/optin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok) {
        setServerError(String(json.error ?? "Something went wrong. Please try again."));
        return;
      }
      const qs = new URLSearchParams({ email: data.email });
      if (plan) qs.set("plan", plan);
      router.push(`/checkout?${qs.toString()}`);
    } catch {
      setServerError("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf8ee] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#0f2035] flex items-center justify-center mx-auto mb-4">
            <PhoneCall size={24} className="text-[#e8b800]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0f2035]">Start Your Free Trial</h1>
          <p className="text-[#0f2035]/55 text-sm mt-2 leading-relaxed">
            Please provide your contact details below to begin your 10-day free trial with us.
          </p>
        </div>

        <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-7 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#0f2035] mb-1.5">
                  First name<span className="text-red-500">*</span>
                </label>
                <input
                  {...register("firstName")}
                  placeholder="Jane"
                  autoComplete="given-name"
                  className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] placeholder-[#0f2035]/30 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800] transition-all"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0f2035] mb-1.5">
                  Last name<span className="text-red-500">*</span>
                </label>
                <input
                  {...register("lastName")}
                  placeholder="Smith"
                  autoComplete="family-name"
                  className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] placeholder-[#0f2035]/30 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800] transition-all"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-1.5">
                Email<span className="text-red-500">*</span>
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="jane@example.com"
                autoComplete="email"
                className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] placeholder-[#0f2035]/30 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800] transition-all"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-1.5">
                Cell phone number<span className="text-red-500">*</span>
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

            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  {...register("consent")}
                  type="checkbox"
                  className="mt-1 w-4 h-4 rounded border-[#0f2035]/25 text-[#e8b800] focus:ring-[#e8b800]/50 flex-shrink-0"
                />
                <span className="text-[#0f2035]/70 text-xs leading-relaxed">
                  I agree to receive automated text messages and/or rvm (ringless voice mail) from
                  Cleveribility, LLC regarding my free trial and subscription to our services
                  selected by you. Message frequency varies. Message and data rates may apply. When
                  you wish to STOP or unsubscribe, contact us at our opt-out form at{" "}
                  <Link href="/stop" className="underline text-[#0f2035] hover:text-[#e8b800]">
                    www.cleveribility.com/stop
                  </Link>
                  . I would like to receive offers/news and accept our Privacy Policy and Terms of
                  Service. Consent is not a condition of purchase.
                </span>
              </label>
              {errors.consent && (
                <p className="text-red-500 text-xs mt-1">{errors.consent.message}</p>
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
              className="w-full bg-[#e8b800] hover:bg-[#f5c842] disabled:opacity-60 text-[#0f2035] font-bold py-3.5 rounded-full transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OptInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fdf8ee]">
          <Loader2 size={32} className="animate-spin text-[#0f2035]" />
        </div>
      }
    >
      <OptInContent />
    </Suspense>
  );
}
