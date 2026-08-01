import type { Adjustments, OutputFormat, PhotoTheme } from "@/types";

export const OUTPUT_FORMATS: OutputFormat[] = [
  { id: "story", name: "Instagram Story", width: 1080, height: 1920, hint: "Portrait 9:16" },
  { id: "post", name: "Instagram Post", width: 1080, height: 1080, hint: "Square 1:1" },
  { id: "square", name: "Square HD", width: 1440, height: 1440, hint: "High-res square" },
  { id: "wallpaper", name: "Phone Wallpaper", width: 1080, height: 2340, hint: "Portrait 19.5:9" },
  { id: "desktop", name: "Desktop Wallpaper", width: 1920, height: 1080, hint: "Landscape 16:9" },
  { id: "portrait", name: "Portrait HD", width: 1440, height: 2560, hint: "Tall portrait" },
  { id: "transparent", name: "Transparent PNG", width: 1080, height: 1080, hint: "Alpha background" },
];

export function getFormat(id: string): OutputFormat {
  return OUTPUT_FORMATS.find((f) => f.id === id) ?? OUTPUT_FORMATS[1];
}

/** Build a native CSS filter string from adjustment values. */
export function toCssFilter(adj: Adjustments): string {
  const parts: string[] = [];
  if (adj.brightness !== 100) parts.push(`brightness(${adj.brightness}%)`);
  if (adj.contrast !== 100) parts.push(`contrast(${adj.contrast}%)`);
  if (adj.saturation !== 100) parts.push(`saturate(${adj.saturation}%)`);
  if (adj.hue !== 0) parts.push(`hue-rotate(${adj.hue}deg)`);
  if (adj.blur > 0) parts.push(`blur(${adj.blur}px)`);
  if (adj.grayscale > 0) parts.push(`grayscale(${adj.grayscale})`);
  if (adj.sepia > 0) parts.push(`sepia(${adj.sepia})`);
  if (adj.invert > 0) parts.push(`invert(${adj.invert})`);
  return parts.join(" ");
}

export function filterForCanvas(adj: Adjustments): string {
  return toCssFilter(adj);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyTint(ctx: CanvasRenderingContext2D, w: number, h: number, warm: number, cool: number) {
  if (Math.abs(warm) < 0.01 && Math.abs(cool) < 0.01) return;
  ctx.globalCompositeOperation = "overlay";
  if (warm > 0) {
    ctx.fillStyle = withAlpha("#ff8a3c", Math.min(0.28, warm * 0.28));
    ctx.fillRect(0, 0, w, h);
  } else if (warm < 0) {
    ctx.fillStyle = withAlpha("#2f6fff", Math.min(0.28, -warm * 0.28));
    ctx.fillRect(0, 0, w, h);
  }
  if (cool > 0) {
    ctx.fillStyle = withAlpha("#3aa6ff", Math.min(0.28, cool * 0.28));
    ctx.fillRect(0, 0, w, h);
  } else if (cool < 0) {
    ctx.fillStyle = withAlpha("#ff6b3c", Math.min(0.28, -cool * 0.28));
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";
}

export function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  if (strength <= 0) return;
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.72,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.35 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function coverFit(
  imgW: number, imgH: number, boxW: number, boxH: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const scale = Math.max(boxW / imgW, boxH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return { dx: (boxW - dw) / 2, dy: (boxH - dh) / 2, dw, dh };
}

function drawBokeh(ctx: CanvasRenderingContext2D, w: number, h: number, seed = 7) {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const count = Math.round((w * h) / 260000);
  for (let i = 0; i < count; i++) {
    const r = 8 + rand() * 46;
    const x = rand() * w;
    const y = rand() * h;
    const alpha = 0.04 + rand() * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, step = 60) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

/** Draw a procedural premium background for a theme. */
export function drawTheme(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: PhotoTheme | null,
) {
  const kind = theme?.kind ?? "stage";
  const colors = theme?.colors?.length ? theme.colors : ["#223669", "#0b1022"];

  if (kind === "transparent") {
    ctx.clearRect(0, 0, w, h);
    return;
  }

  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, colors[0] ?? "#223669");
  base.addColorStop(1, colors[colors.length - 1] ?? "#0b1022");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  switch (kind) {
    case "solid":
      break;
    case "stage": {
      const glow = ctx.createRadialGradient(w / 2, h * 0.14, 10, w / 2, h * 0.14, Math.max(w, h) * 0.6);
      glow.addColorStop(0, "rgba(201,162,75,0.28)");
      glow.addColorStop(0.5, "rgba(201,162,75,0.08)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      drawBokeh(ctx, w, h, 11);
      const light = ctx.createLinearGradient(0, 0, 0, h);
      light.addColorStop(0, "rgba(238,242,255,0.05)");
      light.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "campus": {
      drawBokeh(ctx, w, h, 23);
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(w * (0.2 + i * 0.12), h * 0.3, 40 + i * 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      const floor = ctx.createLinearGradient(0, h * 0.72, 0, h);
      floor.addColorStop(0, "rgba(0,0,0,0)");
      floor.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "glass": {
      drawGrid(ctx, w, h, "rgba(255,255,255,0.05)", Math.round(w / 14));
      drawBokeh(ctx, w, h, 31);
      const sheen = ctx.createLinearGradient(0, 0, w, h);
      sheen.addColorStop(0, "rgba(255,255,255,0.14)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0)");
      sheen.addColorStop(1, "rgba(255,255,255,0.08)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "luxury": {
      const shine = ctx.createRadialGradient(w / 2, h * 0.06, 0, w / 2, h * 0.06, Math.max(w, h) * 0.7);
      shine.addColorStop(0, "rgba(227,195,116,0.16)");
      shine.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, w, h);
      drawBokeh(ctx, w, h, 17);
      break;
    }
    case "gradient":
    default: {
      const accent = ctx.createRadialGradient(w * 0.8, h * 0.2, 0, w * 0.8, h * 0.2, Math.max(w, h) * 0.75);
      accent.addColorStop(0, "rgba(255,255,255,0.1)");
      accent.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w, h);
      drawBokeh(ctx, w, h, 13);
      break;
    }
  }
}

export interface BakeOptions {
  width: number;
  height: number;
  photo: string;
  adjustments: Adjustments;
  theme: PhotoTheme | null;
  quality?: number;
  mime?: string;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/data:(.*?)(;|$)/)?.[1] ?? "image/png";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Bake the photo (with adjustments + theme background) onto a canvas of the
 * target format size. This is the base layer the frame engine stacks on top of.
 */
export async function bakePhotoLayer(opts: BakeOptions): Promise<HTMLCanvasElement> {
  const { width, height, photo, adjustments, theme } = opts;
  const img = await loadImage(photo);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false })!;

  drawTheme(ctx, width, height, theme);

  const filter = filterForCanvas(adjustments);
  ctx.save();
  if (filter) ctx.filter = filter;
  const { dx, dy, dw, dh } = coverFit(img.naturalWidth, img.naturalHeight, width, height);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  applyTint(ctx, width, height, adjustments.warm, adjustments.cool);
  applyVignette(ctx, width, height, adjustments.vignette);
  return canvas;
}

/** Compose a full poster: baked photo layer + frame overlay + caption ribbon. */
export async function composePoster(opts: {
  width: number;
  height: number;
  photo: string;
  adjustments: Adjustments;
  theme: PhotoTheme | null;
  framePath: string | null;
  frameOpacity: number;
  captionLines: string[];
  captionFont: string;
  captionSize: number;
  captionColor: string;
  captionBold?: boolean;
  signature?: string;
}): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = opts.height;
  const ctx = canvas.getContext("2d")!;

  const base = await bakePhotoLayer({
    width: opts.width,
    height: opts.height,
    photo: opts.photo,
    adjustments: opts.adjustments,
    theme: opts.theme,
  });
  ctx.drawImage(base, 0, 0);

  if (opts.framePath) {
    const frameImg = await loadImage(opts.framePath);
    ctx.save();
    ctx.globalAlpha = opts.frameOpacity / 100;
    const { dx, dy, dw, dh } = coverFit(frameImg.naturalWidth, frameImg.naturalHeight, opts.width, opts.height);
    ctx.drawImage(frameImg, dx, dy, dw, dh);
    ctx.restore();
  }

  // Caption ribbon (name / nickname / course / batch).
  if (opts.captionLines.some((l) => l.trim())) {
    const lines = opts.captionLines.filter((l) => l.trim());
    ctx.save();
    ctx.font = `${opts.captionBold ? "700" : "500"} ${opts.captionSize}px ${opts.captionFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = opts.captionColor;
    const lineHeight = opts.captionSize * 1.35;
    let y = opts.height * 0.082;
    for (const line of lines) {
      ctx.fillText(line, opts.width / 2, y);
      y += lineHeight;
    }
    ctx.restore();
  }

  if (opts.signature) {
    ctx.save();
    ctx.font = "500 22px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(238,242,255,0.75)";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8;
    ctx.fillText(opts.signature, opts.width - 24, opts.height - 18);
    ctx.restore();
  }

  return canvas;
}

export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mime: "image/png" | "image/jpeg" | "image/webp",
  quality = 0.92,
): string {
  return canvas.toDataURL(mime, quality);
}
