"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, PhoneCall, Play } from "lucide-react";

type Voice = "male" | "female";

const SAMPLES: { voice: Voice; name: string }[] = [
  { voice: "male", name: "David" },
  { voice: "female", name: "Sarah" },
];

function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes} min ${String(rest).padStart(2, "0")} sec`;
}

export default function HeroSamples() {
  const [urls, setUrls] = useState<{ male: string | null; female: string | null }>({
    male: null,
    female: null,
  });
  const [durations, setDurations] = useState<Record<Voice, number | null>>({
    male: null,
    female: null,
  });
  const [playing, setPlaying] = useState<Voice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/welcome-audio")
      .then((res) => (res.ok ? res.json() : null))
      .then((next: { male: string | null; female: string | null } | null) => {
        if (!cancelled && next) setUrls(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const loaded: HTMLAudioElement[] = [];
    (["male", "female"] as Voice[]).forEach((voice) => {
      const src = urls[voice];
      if (!src) return;
      const audio = new Audio();
      audio.preload = "metadata";
      audio.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(audio.duration)) {
          setDurations((current) => ({ ...current, [voice]: audio.duration }));
        }
      });
      audio.src = src;
      loaded.push(audio);
    });
    return () => {
      loaded.forEach((audio) => {
        audio.src = "";
      });
    };
  }, [urls]);

  function toggle(voice: Voice) {
    const src = urls[voice];
    if (!src) return;

    if (playing === voice) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(src);
    audioRef.current = audio;
    void audio.play();
    setPlaying(voice);
    audio.onended = () => setPlaying(null);
  }

  return (
    <div className="mt-14 max-w-xl mx-auto w-full">
      <p className="text-[#f5c842] text-xs font-semibold uppercase tracking-widest mb-2">
        Hear them first
      </p>
      <p className="text-white/75 text-sm sm:text-base leading-relaxed mb-4">
        Choose a male voice or a female voice. Press play on David or Sarah — the same warm reading that will be waiting in your voicemail.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
      {SAMPLES.map(({ voice, name }) => {
        const src = urls[voice];
        const duration = durations[voice];
        const isPlaying = playing === voice;

        return (
          <div
            key={voice}
            className="bg-white/8 backdrop-blur border border-white/15 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-xl text-left"
          >
            <div className="w-11 h-11 rounded-full bg-[#e8b800]/20 flex items-center justify-center flex-shrink-0">
              <PhoneCall size={20} className="text-[#e8b800]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold">New Voicemail</p>
              <p className="text-white/50 text-xs truncate">
                {name}
                {duration ? ` · ${formatDuration(duration)}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={!src}
              onClick={() => toggle(voice)}
              aria-label={isPlaying ? `Pause ${name} sample` : `Play ${name} sample`}
              className="w-9 h-9 rounded-full bg-[#e8b800] hover:bg-[#f5c842] disabled:opacity-40 disabled:hover:bg-[#e8b800] flex items-center justify-center flex-shrink-0 transition-colors"
            >
              {isPlaying ? (
                <Pause size={14} className="fill-[#0f2035] text-[#0f2035]" />
              ) : (
                <Play size={14} className="fill-[#0f2035] text-[#0f2035] ml-0.5" />
              )}
            </button>
          </div>
        );
      })}
      </div>
    </div>
  );
}
