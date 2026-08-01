"use client";

import confetti from "canvas-confetti";

export function launchConfetti(colors: string[] = ["#C9A24B", "#E3C374", "#223669", "#ffffff"]) {
  const burst = (x: number, y: number, opts: confetti.Options = {}) =>
    confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 42,
      origin: { x, y },
      colors,
      scalar: 1.05,
      zIndex: 9999,
      ...opts,
    });

  burst(0.5, 0.5);
  setTimeout(() => burst(0.25, 0.35, { angle: 60 }), 180);
  setTimeout(() => burst(0.75, 0.35, { angle: 120 }), 340);
}

export function goldenRain(colors: string[] = ["#C9A24B", "#E3C374", "#FFE3A3"]) {
  confetti({
    particleCount: 140,
    spread: 120,
    startVelocity: 38,
    gravity: 0.7,
    colors,
    origin: { x: 0.5, y: 0.2 },
    scalar: 1.15,
    zIndex: 9999,
  });
}

export function sparkleAt(x: number, y: number) {
  confetti({
    particleCount: 26,
    spread: 45,
    startVelocity: 22,
    gravity: 0.5,
    ticks: 90,
    colors: ["#E3C374", "#FFFFFF", "#A78BFA"],
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    zIndex: 9999,
  });
}
