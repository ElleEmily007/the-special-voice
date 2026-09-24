"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Loader2, Pause, PhoneCall, Play } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .min(10, "Enter a valid US phone number")
    .regex(/^\+?[\d\s\-().]{10,}$/, "Invalid phone number format"),
  voice: z.enum(["male", "female"]),
  testament: z.enum(["new", "old", "both"]),
  consentSms: z.boolean().refine((v) => v === true, { message: "You must agree to continue" }),
});

type FormData = z.infer<typeof schema>;

const legalLinkClass = "underline text-[#0f2035] hover:text-[#e8b800]";

function LegalStopLink() {
  return (
    <Link href="/stop" className={legalLinkClass} onClick={(e) => e.stopPropagation()}>
      www.cleveribility.com/stop
    </Link>
  );
}

function LegalPrivacyLink() {
  return (
    <a
      href="https://cleveribility.com/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className={legalLinkClass}
      onClick={(e) => e.stopPropagation()}
    >
      Privacy Policy
    </a>
  );
}

function LegalTermsLink() {
  return (
    <a
      href="https://cleveribility.com/terms-of-use"
      target="_blank"
      rel="noopener noreferrer"
      className={legalLinkClass}
      onClick={(e) => e.stopPropagation()}
    >
      Terms of Service
    </a>
  );
}

function OptInContent() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { consentSms: false, voice: "female", testament: "new" },
  });

  const selectedVoice = watch("voice");
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<{ male: string | null; female: string | null }>({
    male: null,
    female: null,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/welcome-audio")
      .then((res) => (res.ok ? res.json() : null))
      .then((urls: { male: string | null; female: string | null } | null) => {
        if (!cancelled && urls) setPreviewUrls(urls);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function playPreview(voice: "male" | "female") {
    if (playingPreview === voice) {
      audioRef.current?.pause();
      setPlayingPreview(null);
      return;
    }
    const src = previewUrls[voice];
    if (!src) return;
    audioRef.current?.pause();
    const audio = new Audio(src);
    audioRef.current = audio;
    void audio.play();
    setPlayingPreview(voice);
    audio.onended = () => setPlayingPreview(null);
  }

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
      const qs = new URLSearchParams();
      if (plan) qs.set("plan", plan);
      const query = qs.toString();
      router.push(query ? `/checkout?${query}` : "/checkout");
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
            Please tell us how to reach you, and which voice and Bible you want, before payment.
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
              <label className="block text-sm font-semibold text-[#0f2035] mb-2">
                Choose a voice<span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "male", label: "Male", sub: "David — warm, engaging" },
                  { value: "female", label: "Female", sub: "Sarah — British, clear" },
                ].map(({ value, label, sub }) => (
                  <label key={value} className="cursor-pointer">
                    <input {...register("voice")} type="radio" value={value} className="sr-only peer" />
                    <div className="border-2 border-[#0f2035]/12 peer-checked:border-[#e8b800] peer-checked:bg-[#e8b800]/8 rounded-xl p-3 transition-all hover:border-[#0f2035]/25">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#0f2035] font-semibold text-sm">{label}</p>
                          <p className="text-[#0f2035]/40 text-[10px] mt-0.5">{sub}</p>
                        </div>
                        <button
                          type="button"
                          disabled={!previewUrls[value as "male" | "female"]}
                          onClick={(e) => {
                            e.preventDefault();
                            playPreview(value as "male" | "female");
                          }}
                          className="w-8 h-8 rounded-full bg-[#0f2035]/8 hover:bg-[#0f2035]/15 disabled:opacity-40 disabled:hover:bg-[#0f2035]/8 flex items-center justify-center flex-shrink-0 transition-colors"
                          aria-label={`Preview ${label} voice`}
                        >
                          {playingPreview === value ? (
                            <Pause size={13} className="text-[#0f2035]" />
                          ) : (
                            <Play size={13} className="text-[#0f2035] ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-[#0f2035]/40 text-xs mt-1.5">
                You selected: {selectedVoice === "male" ? "Male (David)" : "Female (Sarah)"}.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-2">
                Where would you like to start?<span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "new", label: "New Testament", sub: "Start in the NT" },
                  { value: "old", label: "Old Testament", sub: "Start in the OT" },
                  { value: "both", label: "Both Together", sub: "Complete Bible" },
                ].map(({ value, label, sub }) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      {...register("testament")}
                      type="radio"
                      value={value}
                      className="sr-only peer"
                    />
                    <div className="border-2 border-[#0f2035]/12 peer-checked:border-[#e8b800] peer-checked:bg-[#e8b800]/8 rounded-xl p-3 text-center transition-all hover:border-[#0f2035]/25">
                      <p className="text-[#0f2035] font-semibold text-xs">{label}</p>
                      <p className="text-[#0f2035]/40 text-[10px] mt-0.5">{sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  {...register("consentSms")}
                  type="checkbox"
                  className="mt-1 w-4 h-4 rounded border-[#0f2035]/25 text-[#e8b800] focus:ring-[#e8b800]/50 flex-shrink-0"
                />
                <span className="text-[#0f2035]/70 text-xs leading-relaxed">
                  I agree to receive educational and informational automated text messages from
                  Cleveribility, LLC regarding my free trial and subscription to our services
                  selected by you. Message frequency varies. Message and data rates may apply. When
                  you wish to STOP or unsubscribe, contact us at our opt-out form at{" "}
                  <LegalStopLink />. See our <LegalPrivacyLink /> and <LegalTermsLink /> to learn
                  more. Consent is not a condition of purchase.
                </span>
              </label>
              {errors.consentSms && (
                <p className="text-red-500 text-xs mt-1">{errors.consentSms.message}</p>
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
