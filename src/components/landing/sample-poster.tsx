"use client";

import { useEffect, useRef } from "react";

/**
 * Procedural "sample memory" poster drawn on canvas — used on the landing page
 * so the hero shows a realistic framed selfie without needing a real photo.
 */
export function SamplePoster({
  className,
  caption = "Welcome to Sunstone",
  name = "Aarav · Class of 2026",
  seed = 1,
}: {
  className?: string;
  caption?: string;
  name?: string;
  seed?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = 540;
    const H = 640;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Backdrop
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#223669");
    bg.addColorStop(0.6, "#1b2c58");
    bg.addColorStop(1, "#0b1022");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Glow
    const glow = ctx.createRadialGradient(W / 2, H * 0.3, 10, W / 2, H * 0.3, H * 0.7);
    glow.addColorStop(0, "rgba(201,162,75,0.35)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Portrait silhouette
    const cx = W / 2;
    const cy = H * 0.38;
    const headR = W * 0.17;
    const grad = ctx.createLinearGradient(0, cy - headR * 2.4, 0, cy + headR * 3.4);
    grad.addColorStop(0, "#5b7bd6");
    grad.addColorStop(1, "#223669");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, headR, headR * 1.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - headR * 2.6, H);
    ctx.quadraticCurveTo(cx - headR * 1.9, cy + headR * 1.6, cx - headR * 0.9, cy + headR * 1.5);
    ctx.quadraticCurveTo(cx, cy + headR * 1.1, cx + headR * 0.9, cy + headR * 1.5);
    ctx.quadraticCurveTo(cx + headR * 1.9, cy + headR * 1.6, cx + headR * 2.6, H);
    ctx.fill();

    // Frame
    ctx.save();
    ctx.strokeStyle = "rgba(227,195,116,0.9)";
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.strokeStyle = "rgba(227,195,116,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.restore();

    // Gold corners
    ctx.fillStyle = "#E3C374";
    const c = 26;
    const r = 8;
    const corners: [number, number][] = [
      [14, 14],
      [W - 14 - c, 14],
      [14, H - 14 - c],
      [W - 14 - c, H - 14 - c],
    ];
    for (const [x, y] of corners) {
      ctx.beginPath();
      ctx.moveTo(x, y + r);
      ctx.lineTo(x + c, y + r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x + r, y + c);
      ctx.lineTo(x, y + c);
      ctx.closePath();
      ctx.fill();
    }

    // Caption
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#E3C374";
    ctx.font = "700 34px 'Space Grotesk', sans-serif";
    ctx.fillText(caption, W / 2, H - 86);
    ctx.fillStyle = "rgba(238,242,255,0.92)";
    ctx.font = "600 22px Inter, sans-serif";
    ctx.fillText(name, W / 2, H - 50);

    void seed;
  }, [caption, name, seed]);

  return <canvas ref={ref} className={className} aria-label="Sample Freshers memory" />;
}
