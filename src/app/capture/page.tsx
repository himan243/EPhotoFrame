"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  RefreshCw,
  ArrowRight,
  ImageIcon,
  Wand2,
  RotateCcw,
} from "lucide-react";
import { AmbientBackground } from "@/components/motion/ambient";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/toast";
import { useCamera } from "@/hooks/useCamera";
import { useEditStore } from "@/lib/store";
import { bakePhotoLayer } from "@/lib/image";
import { generateDemoPhoto } from "@/lib/demo";
import { launchConfetti } from "@/components/confetti";
import type { Adjustments } from "@/types";
import { clamp } from "@/lib/utils";

type Phase = "intro" | "camera" | "countdown" | "adjust";

const PRESETS: { name: string; adj: Partial<Adjustments> }[] = [
  { name: "Studio", adj: { brightness: 102, contrast: 108, saturation: 108 } },
  { name: "Vintage", adj: { sepia: 0.35, contrast: 96, brightness: 104 } },
  { name: "B&W", adj: { grayscale: 1, contrast: 112 } },
  { name: "Warm", adj: { warm: 0.5, saturation: 108 } },
  { name: "Cool", adj: { cool: 0.5 } },
  { name: "Vivid", adj: { saturation: 140, contrast: 110 } },
  { name: "Dreamy", adj: { blur: 1.2, brightness: 106, saturation: 112 } },
  { name: "Golden", adj: { warm: 0.4, sepia: 0.18, contrast: 104 } },
];

const FILTERS: { key: keyof Adjustments; label: string; min: number; max: number; step?: number }[] = [
  { key: "brightness", label: "Brightness", min: 50, max: 150 },
  { key: "contrast", label: "Contrast", min: 50, max: 150 },
  { key: "saturation", label: "Saturation", min: 0, max: 200 },
  { key: "hue", label: "Hue", min: -180, max: 180, step: 1 },
  { key: "warm", label: "Warmth", min: -1, max: 1, step: 0.05 },
  { key: "vignette", label: "Vignette", min: 0, max: 1, step: 0.05 },
  { key: "blur", label: "Soft focus", min: 0, max: 6, step: 0.1 },
  { key: "grayscale", label: "Mono", min: 0, max: 1, step: 0.05 },
];

function beep(freq: number, dur = 0.12, vol = 0.12) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close(), 400);
  } catch {
    /* audio optional */
  }
}

export default function CapturePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureRequestedRef = useRef(false);
  const { stream, error, mirror, ready, start, stop, flip, capture, starting } = useCamera(videoRef);
  const [phase, setPhase] = useState<Phase>("intro");
  const [count, setCount] = useState(3);
  const [captured, setCaptured] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const photo = useEditStore((s) => s.photo);
  const adjustments = useEditStore((s) => s.adjustments);
  const setPhoto = useEditStore((s) => s.setPhoto);
  const setAdjustments = useEditStore((s) => s.setAdjustments);
  const resetAdjustments = useEditStore((s) => s.resetAdjustments);

  // attach stream to video element when camera mounts
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => undefined);
    }
  }, [stream, phase]);

  const beginCamera = async () => {
    setPhase("camera");
    captureRequestedRef.current = false;
    await new Promise((r) => setTimeout(r, 80));
    await start();
  };

  const startCountdown = async () => {
    if (!captured && !ready && !stream && !starting) {
      captureRequestedRef.current = true;
      await beginCamera();
      return;
    }

    if (!stream && !captured) return;
    setPhase("countdown");
    setCount(3);
  };

  useEffect(() => {
    if (phase === "camera" && captureRequestedRef.current && !starting && (ready || !!stream)) {
      captureRequestedRef.current = false;
      void startCountdown();
      return;
    }

    if (phase !== "countdown") return;
    if (count === 0) {
      const t = setTimeout(() => {
        const shot = capture() ?? generateDemoPhoto();
        const hadCamera = !!capture();
        setIsDemo(!hadCamera);
        if (!hadCamera) toast("No camera frames — using demo portrait");
        setCaptured(shot);
        setPhoto(shot);
        setPhase("adjust");
        launchConfetti();
        beep(880, 0.35, 0.16);
      }, 40);
      return () => clearTimeout(t);
    }
    beep(660, 0.12);
    const t = setTimeout(() => setCount((c) => c - 1), 850);
    return () => clearTimeout(t);
  }, [phase, count, capture, setPhoto]);

  const applyDemo = () => {
    const shot = generateDemoPhoto();
    setIsDemo(true);
    setCaptured(shot);
    setPhoto(shot);
    setPhase("adjust");
  };

  const retake = () => {
    captureRequestedRef.current = false;
    stop();
    setCaptured(null);
    setPhase("camera");
    setTimeout(() => start(), 80);
  };

  const resetFilter = () => {
    resetAdjustments();
    toast("Filters reset", "success");
  };

  return (
    <main className="relative min-h-screen">
      <AmbientBackground />
      <TopBar onLogo={() => router.push("/")} />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-4">
        <AnimatePresence mode="wait">
          {/* ---------- INTRO ---------- */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="mx-auto flex max-w-2xl flex-col items-center pt-16 text-center sm:pt-24"
            >
              <div className="glass mb-8 flex h-20 w-20 items-center justify-center rounded-[1.6rem] shadow-brand">
                <Camera className="h-9 w-9 text-accent-soft" />
              </div>
              <h1 className="font-display text-balance text-4xl font-bold text-foreground sm:text-5xl">
                Let&apos;s take your <span className="gradient-text">shot</span>
              </h1>
              <p className="mt-4 max-w-md text-muted">
                Frame yourself in the guide. A three-second countdown, then magic.
                You can use your camera or a demo portrait.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" onClick={() => void beginCamera()} disabled={starting}>
                  {starting ? (
                    <span className="mr-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  {starting ? "Starting camera…" : "Use camera & capture"}
                </Button>
                <Button variant="ghost" size="lg" onClick={applyDemo}>
                  <ImageIcon className="h-5 w-5" /> Try demo portrait
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted">No photos are uploaded anywhere — everything stays on this screen.</p>
            </motion.div>
          )}

          {/* ---------- CAMERA ---------- */}
          {(phase === "camera" || phase === "countdown") && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="mx-auto max-w-3xl"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-line shadow-brand">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`aspect-[3/4] w-full object-cover ${mirror ? "-scale-x-100" : ""}`}
                />
                {/* face guide */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
                  <div className="absolute left-1/2 top-1/2 h-[52%] w-[62%] -translate-x-1/2 -translate-y-1/2">
                    <div className="animate-breathe h-full w-full rounded-full border-2 border-dashed border-accent-soft/70" />
                    <p className="absolute -bottom-9 left-1/2 w-44 -translate-x-1/2 text-center text-[11px] font-semibold uppercase tracking-widest text-white/80">
                      Center your face
                    </p>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/50 to-transparent" />
                </div>

                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 px-8 text-center">
                    <CameraOff className="h-10 w-10 text-red-300/80" />
                    <p className="max-w-sm text-sm font-medium text-foreground">{error}</p>
                    <p className="text-xs text-muted">Allow camera access in your browser, or jump straight to a demo portrait.</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => void beginCamera()}>
                        <RefreshCw className="h-4 w-4" /> Try again
                      </Button>
                      <Button size="sm" onClick={applyDemo}>
                        <ImageIcon className="h-4 w-4" /> Use demo portrait
                      </Button>
                    </div>
                  </div>
                )}

                {/* countdown */}
                {phase === "countdown" && count > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                    <motion.div
                      key={count}
                      initial={{ opacity: 0, scale: 2.4, filter: "blur(6px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="font-display text-[9rem] font-bold leading-none text-accent-soft"
                      style={{ textShadow: "0 0 60px rgba(227,195,116,0.6)" }}
                    >
                      {count}
                    </motion.div>
                  </div>
                )}
              </div>

              {/* controls */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button variant="ghost" onClick={retake}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
                <Button variant="ghost" onClick={flip}>
                  <FlipHorizontal className="h-4 w-4" /> Flip
                </Button>
                <Button size="lg" onClick={() => void startCountdown()} disabled={!!error || starting || (!ready && !stream && !captured)}>
                  <Camera className="h-5 w-5" /> {phase === "countdown" ? "Capturing…" : "Capture"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------- ADJUST ---------- */}
          {phase === "adjust" && captured && (
            <motion.div
              key="adjust"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]"
            >
              <div className="relative">
                <Card strong className="overflow-hidden rounded-[2rem] p-3 shadow-brand">
                  <FilterPreview photo={captured} adjustments={adjustments} />
                </Card>
                {isDemo && (
                  <span className="glass-strong absolute left-5 top-5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-soft">
                    Demo portrait
                  </span>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
                    <Wand2 className="h-5 w-5 text-accent" /> Studio polish
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Browser-native adjustments — realistic, never overdone.
                  </p>
                </div>

                {/* presets */}
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setAdjustments(p.adj)}
                      className="btn-ghost rounded-full px-4 py-2 text-xs font-semibold"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {/* sliders */}
                <Card className="space-y-4 rounded-2xl p-5">
                  {FILTERS.map((f) => {
                    const val = adjustments[f.key] as number;
                    const isDefault =
                      (f.min === 0 && f.max === 1 && val === 0) ||
                      (f.key === "brightness" && val === 100) ||
                      (f.key === "contrast" && val === 100) ||
                      (f.key === "saturation" && val === 100) ||
                      (f.key === "hue" && val === 0);
                    return (
                      <Slider
                        key={f.key}
                        label={f.label}
                        value={val}
                        valueLabel={isDefault ? "off" : val.toFixed(f.step && f.step < 1 ? 2 : 0)}
                        min={f.min}
                        max={f.max}
                        step={f.step ?? 1}
                        onChange={(e) =>
                          setAdjustments({ [f.key]: clamp(Number(e.target.value), f.min, f.max) })
                        }
                      />
                    );
                  })}
                </Card>

                <div className="flex flex-wrap gap-3">
                  <Button variant="ghost" onClick={resetFilter}>
                    <RefreshCw className="h-4 w-4" /> Reset
                  </Button>
                  <Button variant="ghost" onClick={retake}>
                    <Camera className="h-4 w-4" /> Retake
                  </Button>
                  <Button
                    size="lg"
                    className="ml-auto"
                    onClick={() => {
                      if (!photo) return;
                      router.push("/edit");
                    }}
                  >
                    Frame it <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

/** Live WYSIWYG preview using the same bake path as final export. */
function FilterPreview({ photo, adjustments }: { photo: string; adjustments: Adjustments }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const render = async () => {
      if (cancelled) return;
      const canvas = ref.current;
      if (!canvas) return;
      const baked = await bakePhotoLayer({
        width: 720,
        height: 960,
        photo,
        adjustments,
        theme: null,
      });
      if (cancelled || !ref.current) return;
      const ctx = ref.current.getContext("2d")!;
      ref.current.width = baked.width;
      ref.current.height = baked.height;
      ctx.drawImage(baked, 0, 0);
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    };
    schedule();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [photo, adjustments]);

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-[1.4rem]">
      <canvas ref={ref} className="h-full w-full object-cover" />
    </div>
  );
}
