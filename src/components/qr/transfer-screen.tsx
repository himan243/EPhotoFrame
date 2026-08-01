"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Gauge,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  Smartphone,
  Upload,
  Zap,
} from "lucide-react";
import { AmbientBackground } from "@/components/motion/ambient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useTransferStore } from "@/lib/store";
import { buildChunks, DEFAULT_FPS, MIN_FPS, MAX_FPS } from "@/lib/qr/protocol";
import { downloadDataUrl, formatBytes } from "@/lib/utils";

export default function TransferScreen() {
  const router = useRouter();
  const { payload, formatId, formatName, width, height, setPayload, clear } = useTransferStore();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [chunks, setChunks] = useState<string[]>([]);
  const [session, setSession] = useState<{ total: number; bytes: number; id: string; mime: string } | null>(null);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [fps, setFps] = useState(DEFAULT_FPS);
  const [loops, setLoops] = useState(1);
  const [rendering, setRendering] = useState(false);

  const build = useCallback(
    (dataUrl: string) => {
      const built = buildChunks(dataUrl);
      setChunks(built.chunks);
      setSession({ total: built.total, bytes: built.bytes, id: built.id, mime: built.mime });
      setIndex(0);
      setLoops(1);
    },
    [],
  );

  useEffect(() => {
    if (!payload) return;
    const t = setTimeout(() => build(payload), 0);
    return () => clearTimeout(t);
  }, [payload, build]);

  const renderFrame = useCallback(async (i: number) => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !chunks.length) return;
    setRendering(true);
    try {
      await QRCode.toCanvas(canvas, chunks[i], {
        errorCorrectionLevel: "H",
        margin: 1,
        width: canvas.width || 420,
        color: { dark: "#0b1022", light: "#ffffff" },
      });
      setIndex(i);
    } catch {
      /* frame skipped — loop continues */
    } finally {
      setRendering(false);
    }
  }, [chunks]);

  const stop = useCallback(() => {
    setRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startBeam = useCallback(
    (fromStart = false) => {
      if (!chunks.length) return;
      stop();
      const startIndex = fromStart ? 0 : index;
      setIndex(startIndex);
      if (fromStart) setLoops(1);
      setRunning(true);
      timerRef.current = setInterval(() => {
        setIndex((prev) => {
          const next = (prev + 1) % chunks.length;
          if (next === 0) setLoops((l) => l + 1);
          void renderFrame(next);
          return next;
        });
      }, 1000 / fps);
      void renderFrame(startIndex);
    },
    [chunks.length, fps, index, renderFrame, stop],
  );

  const start = useCallback(() => {
    startBeam(false);
  }, [startBeam]);

  const restart = useCallback(() => {
    startBeam(true);
  }, [startBeam]);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      stop();
      void startBeam(false);
    }, 0);
    return () => clearTimeout(t);
  }, [fps, running, startBeam, stop]);

  useEffect(() => () => stop(), [stop]);

  const changeSpeed = (delta: number) => {
    setFps((f) => Math.min(MAX_FPS, Math.max(MIN_FPS, f + delta)));
  };

  const uploadImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const max = 1400;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
          const dataUrl = c.toDataURL("image/jpeg", 0.78);
          setPayload(dataUrl, { id: "custom", name: "Custom upload", width: c.width, height: c.height });
          build(dataUrl);
          toast("Image ready to beam", "success");
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const done = chunks.length > 0;
  const pct = chunks.length ? Math.round(((index + 1) / chunks.length) * 100) : 0;
  const estSeconds = chunks.length ? Math.ceil(chunks.length / fps) : 0;
  const loopPercent = pct;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AmbientBackground />

      <header className="relative z-30 flex items-center justify-between px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => router.push("/edit")}
          className="btn-ghost inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-muted sm:block">
          Screen-to-camera transfer
        </p>
        <Button variant="ghost" size="sm" onClick={() => { stop(); clear(); router.push("/capture"); }}>
          New memory
        </Button>
      </header>

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        {/* QR stage */}
        <div className="order-2 mx-auto w-full max-w-[420px] lg:order-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="relative"
          >
            {/* pulsing rings */}
            {running && (
              <>
                <span className="absolute inset-0 -z-10 animate-[pulse-ring_2.2s_ease-out_infinite] rounded-[2.5rem] border border-accent/50" />
                <span className="absolute inset-0 -z-10 animate-[pulse-ring_2.2s_ease-out_infinite_0.7s] rounded-[2.5rem] border border-accent/40" />
              </>
            )}

            <Card strong className="relative rounded-[2.5rem] p-5 shadow-brand">
              <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
              <div className="relative aspect-square overflow-hidden rounded-[1.8rem] bg-white p-3">
                <canvas
                  ref={qrCanvasRef}
                  className="h-full w-full"
                  style={{ imageRendering: "pixelated" }}
                  aria-label="Animated QR code streaming your photo"
                />
                {!done && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 text-center">
                    <QrCode className="h-10 w-10 text-ink/60" />
                    <p className="px-6 text-sm font-medium text-ink/60">
                      Export a poster in the studio to start beaming.
                    </p>
                  </div>
                )}
                {running && (
                  <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] ring-1 ring-inset ring-accent/40">
                    <span className="scan-line" />
                  </div>
                )}
              </div>
              {/* status chip */}
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-accent-soft">
                  <Zap className="h-3.5 w-3.5" />
                  {running ? "Beaming…" : "Paused"}
                  {rendering && <span className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />}
                </span>
                <span className="text-muted">
                  chunk {chunks.length ? index + 1 : 0}/{chunks.length} · loop {loops}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft"
                  animate={{ width: `${loopPercent}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </Card>
          </motion.div>

          {/* controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!running ? (
              <>
                <Button size="lg" onClick={start} disabled={!done}>
                  <Play className="h-5 w-5" /> Start beam
                </Button>
                <Button size="lg" variant="ghost" onClick={restart} disabled={!done}>
                  <RefreshCw className="h-5 w-5" /> Restart beam
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" variant="ghost" onClick={stop}>
                  <Pause className="h-5 w-5" /> Pause
                </Button>
                <Button size="lg" variant="ghost" onClick={restart}>
                  <RefreshCw className="h-5 w-5" /> Restart beam
                </Button>
              </>
            )}
            <div className="flex items-center gap-1 rounded-full border border-line bg-white/5 p-1">
              <Button variant="ghost" size="iconSm" onClick={() => changeSpeed(-1)} disabled={fps <= MIN_FPS} aria-label="Slower">
                −
              </Button>
              <span className="flex items-center gap-1 px-2 text-xs font-bold text-foreground">
                <Gauge className="h-3.5 w-3.5 text-accent" /> {fps} fps
              </span>
              <Button variant="ghost" size="iconSm" onClick={() => changeSpeed(1)} disabled={fps >= MAX_FPS} aria-label="Faster">
                +
              </Button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted">
            Slower = easier for the phone camera to catch every frame.
          </p>
        </div>

        {/* info column */}
        <div className="order-1 lg:order-2">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-soft">
              <Smartphone className="h-3.5 w-3.5" /> Offline magic
            </p>
            <h1 className="font-display text-balance text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Beaming your memory <span className="gradient-text">through light</span>
            </h1>
            <p className="mt-4 max-w-lg text-muted">
              Every chunk is its own QR code with Reed–Solomon error correction.
              The phone&apos;s camera reads what it sees — missed frames are simply
              re-sent on the next pass. No internet, no Bluetooth, no Wi-Fi.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 grid gap-3 sm:grid-cols-3"
              >
                <Stat label="Chunks" value={String(session?.total ?? 0)} />
                <Stat label="Payload" value={formatBytes(session?.bytes ?? 0)} />
                <Stat label="Pass time" value={`~${estSeconds}s`} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
                <Card className="space-y-4 p-6">
                  <p className="text-sm text-muted">You don&apos;t have a poster ready yet.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => router.push("/edit")}>
                      <ArrowRight className="h-4 w-4" /> Open the studio
                    </Button>
                    <Button variant="ghost" onClick={uploadImage}>
                      <Upload className="h-4 w-4" /> Send an image file
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="mt-6 space-y-3 rounded-2xl p-6">
            <p className="font-display text-sm font-bold uppercase tracking-wider text-accent-soft">
              How the phone receives it
            </p>
            <ol className="space-y-2.5 text-sm text-muted">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-bold text-accent-soft">1</span>
                On the student&apos;s phone, open this site &amp; tap <b className="text-foreground">Receive photo</b>.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-bold text-accent-soft">2</span>
                Point the phone camera at this screen — keep it steady and close.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-bold text-accent-soft">3</span>
                Watch the pieces fall into place, then save to camera roll. Done.
              </li>
            </ol>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="ghost" onClick={() => window.open("/receive", "_blank")}>
                <QrCode className="h-4 w-4" /> Open receiver
              </Button>
              {payload && (
                <Button variant="ghost" onClick={() => downloadDataUrl(payload, `sunstone-freshers-${formatId}.jpg`)}>
                  <Download className="h-4 w-4" /> Download local copy
                </Button>
              )}
            </div>
          </Card>

          <p className="mt-5 text-xs text-muted">
            Poster: <b className="text-foreground">{formatName}</b> · {width}×{height} · transferred image is JPEG-compressed for speed.
          </p>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl p-4 text-center">
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
    </Card>
  );
}
