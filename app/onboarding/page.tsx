"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Loader2, PhoneCall, Play, Pause } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .min(10, "Enter a valid US phone number")
    .regex(/^\+?[\d\s\-().]{10,}$/, "Invalid phone number format"),
  voice: z.enum(["male", "female"]),
  testament: z.enum(["new", "old", "both"]),
  frequency: z.string(),
});

type FormData = z.infer<typeof schema>;

function OnboardingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");

  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      voice: "female",
      testament: "new",
      frequency: "1",
    },
  });

  const selectedVoice = watch("voice");
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function playPreview(voice: "male" | "female") {
    if (playingPreview === voice) {
      audioRef.current?.pause();
      setPlayingPreview(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(`/audio/${voice}/000-welcome.mp3`);
    audioRef.current = audio;
    audio.play();
    setPlayingPreview(voice);
    audio.onended = () => setPlayingPreview(null);
  }

  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
    }
  }, [sessionId, router]);

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      const res = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, frequency: Number(data.frequency), sessionId }),
      });
      const json = await res.json() as { customer?: unknown; error?: unknown };
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
            You&apos;re all set!
          </h1>
          <p className="text-[#0f2035]/60 mb-6 leading-relaxed">
            Your account is set up and your free trial starts today. Your first Bible story
            voicemail will arrive shortly. Welcome to The Special Voice!
          </p>
          <div className="bg-[#0f2035]/5 rounded-xl px-5 py-4 text-left mb-6 space-y-2 text-sm">
            <p className="text-[#0f2035]/50">What happens next:</p>
            <p className="text-[#0f2035]/75">✓ First voicemail delivered within 24 hours</p>
            <p className="text-[#0f2035]/75">✓ Daily deliveries start from tomorrow</p>
            <p className="text-[#0f2035]/75">✓ No charge until your 10-day trial ends</p>
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

  return (
    <div className="min-h-screen bg-[#fdf8ee] py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#0f2035] flex items-center justify-center mx-auto mb-4">
            <PhoneCall size={24} className="text-[#e8b800]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0f2035]">
            Set Up Your Account
          </h1>
          <p className="text-[#0f2035]/55 text-sm mt-1">
            Tell us where to deliver your daily Bible stories.
          </p>
        </div>

        <div className="bg-white border border-[#0f2035]/10 rounded-2xl p-7 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-1.5">
                Full Name
              </label>
              <input
                {...register("name")}
                placeholder="Jane Smith"
                className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] placeholder-[#0f2035]/30 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800] transition-all"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-1.5">
                Cell Phone Number
              </label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="(555) 867-5309"
                className="w-full border border-[#0f2035]/15 rounded-xl px-4 py-3 text-[#0f2035] placeholder-[#0f2035]/30 focus:outline-none focus:ring-2 focus:ring-[#e8b800]/50 focus:border-[#e8b800] transition-all"
              />
              <p className="text-[#0f2035]/40 text-xs mt-1">
                This is where your voicemails will be delivered.
              </p>
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Voice */}
            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-2">
                Choose a voice
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "male", label: "Male", sub: "David — warm, engaging" },
                  { value: "female", label: "Female", sub: "Sarah — British, clear" },
                ].map(({ value, label, sub }) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      {...register("voice")}
                      type="radio"
                      value={value}
                      className="sr-only peer"
                    />
                    <div className="border-2 border-[#0f2035]/12 peer-checked:border-[#e8b800] peer-checked:bg-[#e8b800]/8 rounded-xl p-3 transition-all hover:border-[#0f2035]/25">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#0f2035] font-semibold text-sm">{label}</p>
                          <p className="text-[#0f2035]/40 text-[10px] mt-0.5">{sub}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            playPreview(value as "male" | "female");
                          }}
                          className="w-8 h-8 rounded-full bg-[#0f2035]/8 hover:bg-[#0f2035]/15 flex items-center justify-center flex-shrink-0 transition-colors"
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
                Tap the play button to preview each voice. You selected: {selectedVoice === "male" ? "Male (David)" : "Female (Sarah)"}.
              </p>
              {errors.voice && (
                <p className="text-red-500 text-xs mt-1">{errors.voice.message}</p>
              )}
            </div>

            {/* Testament */}
            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-2">
                Where would you like to start?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "new", label: "New Testament", sub: "210 stories" },
                  { value: "old", label: "Old Testament", sub: "209 stories" },
                  { value: "both", label: "Both Together", sub: "Interleaved" },
                ].map(({ value, label, sub }) => (
                  <label
                    key={value}
                    className="cursor-pointer"
                  >
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
              {errors.testament && (
                <p className="text-red-500 text-xs mt-1">{errors.testament.message}</p>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-semibold text-[#0f2035] mb-2">
                How many stories per day?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "1", label: "1 per day", sub: "~6 yr finish" },
                  { value: "2", label: "2 per day", sub: "~3 yr finish" },
                  { value: "3", label: "3 per day", sub: "~1.5 yr finish" },
                ].map(({ value, label, sub }) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      {...register("frequency")}
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
              {errors.frequency && (
                <p className="text-red-500 text-xs mt-1">{errors.frequency.message}</p>
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
                "Complete My Setup"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8ee]">
        <Loader2 size={32} className="animate-spin text-[#0f2035]" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
