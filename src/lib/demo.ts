/**
 * Procedural demo portrait used when a device has no camera (or the user
 * prefers a quick preview). Everything is drawn locally — no photos, no AI.
 */
export function generateDemoPhoto(): string {
  const W = 900;
  const H = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2c4382");
  bg.addColorStop(0.55, "#223669");
  bg.addColorStop(1, "#121c40");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, H * 0.3, 10, W / 2, H * 0.3, H * 0.65);
  glow.addColorStop(0, "rgba(201,162,75,0.3)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const bokeh = (seed: number) => {
    let s = seed;
    const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(rand() * W, rand() * H, 6 + rand() * 34, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.03 + rand() * 0.07})`;
      ctx.fill();
    }
  };
  bokeh(17);

  const cx = W / 2;
  const cy = H * 0.4;
  const headR = W * 0.13;
  const skin = ctx.createLinearGradient(0, cy - headR * 2.2, 0, cy + headR * 3);
  skin.addColorStop(0, "#f5cba7");
  skin.addColorStop(1, "#d9a678");
  ctx.fillStyle = skin;

  // shoulders / body
  ctx.beginPath();
  ctx.moveTo(cx - headR * 3.1, H);
  ctx.quadraticCurveTo(cx - headR * 2.3, cy + headR * 1.5, cx - headR * 1.0, cy + headR * 1.4);
  ctx.quadraticCurveTo(cx, cy + headR * 1.1, cx + headR * 1.0, cy + headR * 1.4);
  ctx.quadraticCurveTo(cx + headR * 2.3, cy + headR * 1.5, cx + headR * 3.1, H);
  ctx.fill();

  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(cx - headR * 0.22, cy + headR * 0.85, headR * 0.44, headR * 0.7);

  // hair
  ctx.fillStyle = "#1b1b2f";
  ctx.beginPath();
  ctx.arc(cx, cy - headR * 0.15, headR * 1.04, Math.PI * 0.92, Math.PI * 2.08);
  ctx.quadraticCurveTo(cx + headR * 1.0, cy + headR * 0.6, cx + headR * 0.5, cy + headR * 0.45);
  ctx.quadraticCurveTo(cx, cy + headR * 0.9, cx - headR * 0.5, cy + headR * 0.45);
  ctx.quadraticCurveTo(cx - headR * 1.0, cy + headR * 0.6, cx - headR * 1.04, cy - headR * 0.15);
  ctx.closePath();
  ctx.fill();

  // face
  ctx.beginPath();
  ctx.ellipse(cx, cy, headR, headR * 1.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();

  // face hair front
  ctx.fillStyle = "#1b1b2f";
  ctx.beginPath();
  ctx.ellipse(cx, cy - headR * 0.75, headR * 0.92, headR * 0.5, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // eyes + smile (friendly)
  ctx.fillStyle = "#2b2b3d";
  const eyeY = cy - headR * 0.08;
  ctx.beginPath();
  ctx.arc(cx - headR * 0.42, eyeY, headR * 0.06, 0, Math.PI * 2);
  ctx.arc(cx + headR * 0.42, eyeY, headR * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8c5a34";
  ctx.lineWidth = headR * 0.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, eyeY + headR * 0.42, headR * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // hoodie
  const hood = ctx.createLinearGradient(0, cy + headR, 0, H);
  hood.addColorStop(0, "#c9a24b");
  hood.addColorStop(1, "#8c6c2a");
  ctx.fillStyle = hood;
  ctx.beginPath();
  ctx.moveTo(cx - headR * 3.1, H);
  ctx.quadraticCurveTo(cx - headR * 2.3, cy + headR * 1.5, cx - headR * 1.0, cy + headR * 1.4);
  ctx.lineTo(cx + headR * 1.0, cy + headR * 1.4);
  ctx.quadraticCurveTo(cx + headR * 2.3, cy + headR * 1.5, cx + headR * 3.1, H);
  ctx.closePath();
  ctx.fill();

  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  return canvas.toDataURL("image/jpeg", 0.9);
}
