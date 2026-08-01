"use client";

import { cn } from "@/lib/utils";

/**
 * Ambient aurora background — slowly drifting gradient orbs plus floating
 * particles rendered on a single fixed canvas. GPU friendly (no layout thrash).
 */
export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute -left-[20%] -top-[25%] h-[60vmax] w-[60vmax] rounded-full bg-primary/40 opacity-70 blur-[120px] animate-aurora" />
      <div
        className="absolute -right-[15%] top-[10%] h-[45vmax] w-[45vmax] rounded-full bg-accent/15 opacity-80 blur-[130px] animate-aurora"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute bottom-[-30%] left-[25%] h-[50vmax] w-[50vmax] rounded-full bg-[#7c5cff]/20 opacity-70 blur-[140px] animate-aurora"
        style={{ animationDelay: "-12s" }}
      />
      <ParticleField />
    </div>
  );
}

function ParticleField() {
  return (
    <canvas
      className="absolute inset-0 h-full w-full"
      ref={(el) => {
        if (!el) return;
        const ctx = el.getContext("2d");
        if (!ctx) return;
        let raf = 0;
        let w = (el.width = el.offsetWidth || window.innerWidth);
        let h = (el.height = el.offsetHeight || window.innerHeight);
        const DPR = Math.min(2, window.devicePixelRatio || 1);
        el.width = w * DPR;
        el.height = h * DPR;
        ctx.scale(DPR, DPR);

        const N = Math.min(70, Math.floor((w * h) / 18000));
        const particles = Array.from({ length: N }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1 + Math.random() * 2.2,
          vx: (Math.random() - 0.5) * 0.22,
          vy: -0.08 - Math.random() * 0.22,
          a: 0.12 + Math.random() * 0.4,
        }));

        const draw = () => {
          ctx.clearRect(0, 0, w, h);
          for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -8) {
              p.y = h + 8;
              p.x = Math.random() * w;
            }
            if (p.x < -8) p.x = w + 8;
            if (p.x > w + 8) p.x = -8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(238,242,255,${p.a})`;
            ctx.fill();
          }
          raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);

        const onResize = () => {
          w = el.offsetWidth || window.innerWidth;
          h = el.offsetHeight || window.innerHeight;
          el.width = w * DPR;
          el.height = h * DPR;
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        };
        window.addEventListener("resize", onResize);
        return () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", onResize);
        };
      }}
    />
  );
}
