"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import jsQR from "jsqr";
import {
  CameraOff,
  Download,
  Home,
  RefreshCw,
  ScanLine,
  Smartphone,
  Check,
} from "lucide-react";
import { AmbientBackground } from "@/components/motion/ambient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { createReceiver } from "@/lib/qr/decode";
import { launchConfetti, goldenRain } from "@/components/confetti";
import { useAppStore } from "@/lib/store";
import { downloadDataUrl } from "@/lib/utils";

type Phase = "idle" | "scanning" | "done" | "error";

export default function ReceiveScreen() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const receiverRef = useRef(createReceiver());
  const captureFallbackRef = useRef<number | null>(null);
  const imageCaptureRef = useRef<any>(null);
  const [usePreviewFallback, setUsePreviewFallback] = useState(false);
  const [noFrames, setNoFrames] = useState(false);
  const [wasScanningOnHide, setWasScanningOnHide] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [got, setGot] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState(0);
  const [stale, setStale] = useState(false);
  const addBadge = useAppStore((s) => s.addBadge);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    if (captureFallbackRef.current) {
      clearTimeout(captureFallbackRef.current as number);
      captureFallbackRef.current = null;
    }
    imageCaptureRef.current = null;
    setUsePreviewFallback(false);
  }, []);

  const finish = useCallback((dataUrl: string) => {
    stop();
    setResult(dataUrl);
    setPhase("done");
    launchConfetti();
    addBadge("Memory received");
    setTimeout(() => goldenRain(), 600);
  }, [stop, addBadge]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function scanLoop() {
    const video = videoRef.current;
    const hidden = hiddenRef.current;
    if (!video || !hidden) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      hidden.width = video.videoWidth;
      hidden.height = video.videoHeight;
      const ctx = hidden.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(video, 0, 0, hidden.width, hidden.height);
      const img = ctx.getImageData(0, 0, hidden.width, hidden.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (code?.data) {
        const res = receiverRef.current.handle(code.data);
        if (res === "accepted" || res === "done") {
          const s = receiverRef.current.session();
          if (s) {
            setGot(s.got);
            setTotal(s.total);
          }
          setLastPing(Date.now());
        }
        if (res === "done") {
          const dataUrl = receiverRef.current.complete();
          if (dataUrl) {
            finish(dataUrl);
            return;
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }

  const startScan = useCallback(async () => {
    setError(null);
    setResult(null);
    receiverRef.current.reset();
    setGot(0);
    setTotal(0);
    stop();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera API unavailable.");

      const candidates: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 960 }, height: { ideal: 960 } }, audio: false },
        { video: { facingMode: { ideal: "user" }, width: { ideal: 960 }, height: { ideal: 960 } }, audio: false },
        { video: { width: { ideal: 960 }, height: { ideal: 960 } }, audio: false },
        { video: true, audio: false },
      ];

      let lastError: unknown;
      let stream: MediaStream | null = null;
      for (const candidate of candidates) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(candidate);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!stream) throw lastError instanceof Error ? lastError : new Error("Camera unavailable.");

      streamRef.current = stream;
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = stream;
        } catch {}
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.autoplay = true;
        try {
          await videoRef.current.play();
        } catch {
          // autoplay may be blocked; fallback will try to surface frames
        }
      }
      setPhase("scanning");
      rafRef.current = requestAnimationFrame(scanLoop);

      // If the video element isn't producing frames, try ImageCapture fallback to draw into a canvas.
      const checkDims = () => {
        const v = videoRef.current;
        if (v && v.videoWidth > 0 && v.videoHeight > 0) {
          if (captureFallbackRef.current) {
            clearTimeout(captureFallbackRef.current as number);
            captureFallbackRef.current = null;
          }
          setUsePreviewFallback(false);
          return;
        }
        try {
          const track = stream.getVideoTracks()[0];
          const ImageCaptureCtor = (window as any).ImageCapture || null;
          if (ImageCaptureCtor && track) {
            imageCaptureRef.current = new ImageCaptureCtor(track);
            setUsePreviewFallback(true);
            const grabLoop = async () => {
              try {
                const bitmap = await imageCaptureRef.current.grabFrame();
                const pc = previewRef.current;
                if (pc && bitmap) {
                  pc.width = bitmap.width;
                  pc.height = bitmap.height;
                  const ctx = pc.getContext('2d');
                  ctx?.drawImage(bitmap, 0, 0, pc.width, pc.height);
                }
              } catch {
                // ignore single-frame errors
              }
              captureFallbackRef.current = window.setTimeout(grabLoop, 120);
            };
            grabLoop();
          }
        } catch (e) {
          // ignore
        }
      };
      captureFallbackRef.current = window.setTimeout(checkDims, 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera unavailable.");
      setPhase("error");
    }
  }, [scanLoop, stop]);

  // detect if attached stream fails to produce frames (e.g., camera held by another tab)
  useEffect(() => {
    let poll: number | null = null;
    if (phase === "scanning" && streamRef.current && !usePreviewFallback) {
      const start = Date.now();
      const check = () => {
        const v = videoRef.current;
        if (v && v.videoWidth > 0 && v.videoHeight > 0) {
          setNoFrames(false);
          return;
        }
        if (Date.now() - start > 900) setNoFrames(true);
        poll = window.setTimeout(check, 300);
      };
      check();
    } else {
      setNoFrames(false);
    }
    return () => {
      if (poll) clearTimeout(poll);
    };
  }, [phase, usePreviewFallback]);

  // release camera when tab is hidden and prompt resume when visible
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (phase === "scanning") {
          setWasScanningOnHide(true);
          stop();
        }
      } else {
        if (wasScanningOnHide) {
          // don't auto-start (user gesture required in many browsers). show UI to resume.
          setNoFrames(true);
        }
        setWasScanningOnHide(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, stop, wasScanningOnHide]);

  const resetAll = () => {
    stop();
    receiverRef.current.reset();
    setResult(null);
    setGot(0);
    setTotal(0);
    setPhase("idle");
  };

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    const tick = () => setStale(lastPing > 0 && Date.now() - lastPing > 2500);
    const id = setInterval(tick, 500);
    tick();
    return () => clearInterval(id);
  }, [lastPing]);

  // progress ring
  const pct = total ? Math.round((got / total) * 100) : 0;

  return (
    <main className="relative min-h-screen">
      <AmbientBackground />
      <header className="relative z-30 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="iconSm" onClick={() => router.push("/")} aria-label="Home">
            <Home className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-lg font-bold text-foreground">Receive your photo</h1>
        </div>
        <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-muted sm:block">
          Point · catch · done
        </p>
      </header>

      <div className="relative z-10 mx-auto max-w-md px-5 pb-20 pt-4">
        <AnimatePresence mode="wait">
          {/* ---------- IDLE ---------- */}
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="flex flex-col items-center pt-14 text-center"
            >
              <div className="glass mb-7 flex h-20 w-20 items-center justify-center rounded-[1.6rem] shadow-brand">
                <Smartphone className="h-9 w-9 text-accent-soft" />
              </div>
              <h2 className="font-display text-3xl font-bold text-foreground">
                Point at the <span className="gradient-text">beaming screen</span>
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                Hold your phone a hand&apos;s length away from the kiosk screen.
                The camera will read the flashing light codes and rebuild your
                full-resolution photo — no internet needed.
              </p>
              <Button size="lg" className="mt-8" onClick={() => void startScan()}>
                <ScanLine className="h-5 w-5" /> Start scanning
              </Button>
              <p className="mt-5 text-[11px] text-muted">Camera stays on your device — nothing is uploaded.</p>
            </motion.div>
          )}

          {/* ---------- SCANNING ---------- */}
          {phase === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-5"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-line shadow-brand">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="aspect-[3/4] w-full object-cover"
                  style={{ background: "#050814" }}
                />
                {usePreviewFallback && (
                  <canvas
                    ref={previewRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ display: "block" }}
                  />
                )}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-accent-soft/80 shadow-[0_0_0_9999px_rgba(5,8,20,0.55)]">
                    <span className="scan-line" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-center">
                    {total > 0 ? (
                      <p className="text-sm font-semibold text-white">
                        Receiving… {got}/{total} pieces
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-white">Waiting for signal…</p>
                    )}
                    {stale && total > 0 && (
                      <p className="mt-1 text-[11px] text-accent-soft">Hold still — re-reading missed frames…</p>
                    )}
                  </div>
                </div>
              </div>

              {/* progress map */}
              <Card className="rounded-2xl p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted">Signal map</span>
                  <span className="font-bold text-accent-soft">{pct}%</span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <ChunkMap total={total} got={got} />
              </Card>

              <div className="flex justify-center">
                <Button variant="ghost" onClick={resetAll}>
                  <RefreshCw className="h-4 w-4" /> Cancel
                </Button>
              </div>
              {noFrames && (
                <Card className="mt-4 p-3">
                  <p className="text-sm text-muted">Preview not showing — camera may be in use by another tab or blocked from autoplay.</p>
                  <div className="mt-3 flex justify-center gap-3">
                    <Button onClick={() => { stop(); void startScan(); }}>
                      <RefreshCw className="h-4 w-4" /> Restart camera
                    </Button>
                    <Button variant="ghost" onClick={() => {
                      setNoFrames(false);
                      const v = videoRef.current;
                      if (v) v.play().catch(() => {});
                    }}>
                      Resume
                    </Button>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* ---------- DONE ---------- */}
          {phase === "done" && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 18 }}
              className="flex flex-col items-center pt-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                className="glass mb-5 flex h-16 w-16 items-center justify-center rounded-full border-accent/50"
              >
                <Check className="h-8 w-8 text-accent-soft" />
              </motion.div>
              <h2 className="font-display text-3xl font-bold text-foreground">Memory received</h2>
              <p className="mt-2 text-sm text-muted">
                Reassembled from {total} light frames · checksum verified · zero internet used.
              </p>

              <Card strong className="mt-6 overflow-hidden rounded-[1.8rem] p-3 shadow-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result} alt="Your framed Freshers memory" className="max-h-[52vh] w-auto rounded-[1.3rem]" />
              </Card>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => downloadDataUrl(result, "sunstone-freshers-memory.jpg")}>
                  <Download className="h-5 w-5" /> Save to camera roll
                </Button>
                <Button variant="ghost" size="lg" onClick={resetAll}>
                  <RefreshCw className="h-4 w-4" /> Scan another
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------- ERROR ---------- */}
          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center pt-14 text-center"
            >
              <CameraOff className="mb-5 h-12 w-12 text-muted" />
              <h2 className="font-display text-2xl font-bold text-foreground">Camera unavailable</h2>
              <p className="mt-3 max-w-sm text-sm text-muted">{error ?? "Could not access the camera."}</p>
              <Button className="mt-8" onClick={() => void startScan()}>
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
              <button type="button" onClick={() => toast("Tip: keep the screen steady, lower the phone's brightness")} className="mt-4 text-xs text-muted underline underline-offset-2 hover:text-foreground">
                Scanning tips
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* hidden decode canvas */}
        <canvas ref={hiddenRef} className="hidden" />
      </div>
    </main>
  );
}

function ChunkMap({ total, got }: { total: number; got: number }) {
  const cells = Array.from({ length: total }, (_, i) => i < got);
  if (total === 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-white/8" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {cells.map((done, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0.5, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`h-2.5 w-2.5 rounded-full ${done ? "bg-accent shadow-[0_0_8px_rgba(201,162,75,0.7)]" : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}
