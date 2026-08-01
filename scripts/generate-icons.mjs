/**
 * Generates PWA icons as PNGs using a tiny pure-JS PNG encoder (Node zlib).
 * Usage:  npm run generate:icons
 * Produces public/icons/{icon-512,icon-192,apple-touch-icon,icon-32}.png
 * and a maskable 512 variant.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(path.resolve(__dirname, ".."), "public", "icons");

/* ---------------- minimal PNG encoder ---------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------- drawing (supersampled) ---------------- */
function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function insideRoundedRect(x, y, w, h, r, px, py) {
  if (px < 0 || py < 0 || px >= w || py >= h) return false;
  const cx = Math.max(r, Math.min(w - r, px));
  const cy = Math.max(r, Math.min(h - r, py));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function render(size) {
  const SS = 4;
  const big = size * SS;
  const px = new Float64Array(big * big * 3); // rgb (0-255), a separate
  const alpha = new Float64Array(big * big);

  const set = (x, y, r, g, b, a) => {
    const i = (y * big + x) * 3;
    const blend = a;
    px[i] = px[i] * (1 - blend) + r * blend;
    px[i + 1] = px[i + 1] * (1 - blend) + g * blend;
    px[i + 2] = px[i + 2] * (1 - blend) + b * blend;
    alpha[y * big + x] = Math.max(alpha[y * big + x], a);
  };

  const top = hex("#223669");
  const bot = hex("#0b1022");
  const goldA = hex("#E3C374");
  const goldB = hex("#C9A24B");
  const c = big / 2;

  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const n = y / big;
      const grad = [
        lerp(top[0], bot[0], n),
        lerp(top[1], bot[1], n),
        lerp(top[2], bot[2], n),
      ];
      set(x, y, grad[0], grad[1], grad[2], 1);
    }
  }

  // mask rounded corners (alpha)
  const rr = big * 0.185;
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      if (!insideRoundedRect(0, 0, big, big, rr, x, y)) alpha[y * big + x] = 0;
    }
  }

  // subtle top sheen
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const n = 1 - y / big;
      set(x, y, 255, 255, 255, n * n * 0.06);
    }
  }

  // sun: outer glow ring
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.sqrt(dx * dx + dy * dy);
      const R = big * 0.26;
      if (Math.abs(d - R) < big * 0.045) {
        const t = (d - (R - big * 0.045)) / (big * 0.09);
        const mix = Math.max(0, Math.min(1, t));
        set(x, y, lerp(goldA[0], goldB[0], mix), lerp(goldA[1], goldB[1], mix), lerp(goldA[2], goldB[2], mix), 1 - Math.abs(t - 0.5) * 2);
      }
      // sun rays
      for (let k = 0; k < 8; k++) {
        const ang = (k * Math.PI) / 4;
        const sx = Math.cos(ang);
        const sy = Math.sin(ang);
        const dot = (dx * sx + dy * sy) / big;
        const lat = Math.abs(dx * -sy + dy * sx);
        if (dot > 0.3 && dot < 0.44 && lat < big * 0.035) {
          set(x, y, goldA[0], goldA[1], goldA[2], 1);
        }
      }
      // center gem
      if (d < big * 0.075) {
        set(x, y, goldB[0], goldB[1], goldB[2], 1);
      } else if (d < big * 0.095) {
        const t = (d - big * 0.075) / (big * 0.02);
        set(x, y, goldB[0], goldB[1], goldB[2], 1 - t);
      }
    }
  }

  // downsample SS -> 1
  const out = Buffer.alloc(size * size * 4);
  const s = SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;
      for (let sy = 0; sy < s; sy++) {
        for (let sx = 0; sx < s; sx++) {
          const xx = x * s + sx;
          const yy = y * s + sy;
          const i = (yy * big + xx) * 3;
          const a = alpha[yy * big + xx];
          rAcc += px[i] * a;
          gAcc += px[i + 1] * a;
          bAcc += px[i + 2] * a;
          aAcc += a;
        }
      }
      const n = s * s;
      const oi = (y * size + x) * 4;
      if (aAcc === 0) {
        out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0;
      } else {
        out[oi] = Math.round(rAcc / aAcc);
        out[oi + 1] = Math.round(gAcc / aAcc);
        out[oi + 2] = Math.round(bAcc / aAcc);
        out[oi + 3] = Math.round((aAcc / n) * 255);
      }
    }
  }
  return encodePNG(size, size, out);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const targets = [
    ["icon-512.png", 512],
    ["icon-512-maskable.png", 512],
    ["icon-192.png", 192],
    ["apple-touch-icon.png", 180],
    ["icon-32.png", 32],
  ];
  for (const [name, size] of targets) {
    await fs.writeFile(path.join(OUT, name), render(size));
    console.log(`  wrote ${name} (${size}px)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
