/**
 * Animated QR streaming protocol (Screen-to-Camera Communication).
 *
 * A payload (base64 image data) is split into chunks. Each chunk is wrapped in
 * a self-describing header and encoded as an animated QR code frame:
 *
 *   SUNQR|v|id|index|total|crc|mime|len|data
 *
 *  - v     : protocol version (1)
 *  - id    : transfer session id (radix-36 timestamp)
 *  - index : zero-based chunk index
 *  - total : number of chunks
 *  - crc   : CRC32 (hex) of the FULL base64 payload — validated on reassembly
 *  - mime  : short mime code (jpg | png | webp)
 *  - len   : length of the full base64 payload
 *  - data  : this chunk's base64 slice
 *
 * Frames are shown in a continuous loop on the kiosk screen; the phone camera
 * decodes whatever frames it can catch. Because every chunk is self-contained
 * and idempotent, dropped frames are simply re-read on the next loop pass
 * ("auto-resume"). Reed–Solomon error correction is built into every QR code.
 */

export const MAGIC = "SUNQR";
export const PROTO_VERSION = "1";
export const CHUNK_DATA_SIZE = 500; // base64 chars per QR payload
export const DEFAULT_FPS = 6;
export const MIN_FPS = 2;
export const MAX_FPS = 12;

export const MIME_CODE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const CODE_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_CODE).map(([m, c]) => [c, m]),
);

/** CRC32 (standard polynomial), returns unsigned 32-bit int. */
export function crc32(str: string): number {
  let c: number;
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    c = str.charCodeAt(i);
    crc ^= c;
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function crcHex(str: string): string {
  return crc32(str).toString(16).padStart(8, "0");
}

export interface ParsedChunk {
  valid: boolean;
  id?: string;
  index?: number;
  total?: number;
  crc?: string;
  mime?: string;
  len?: number;
  data?: string;
}

/** Parse a decoded QR string into a structured chunk. */
export function parseChunk(raw: string): ParsedChunk {
  const parts = raw.split("|");
  if (parts.length < 8) return { valid: false };
  const [magic, ver, id, indexStr, totalStr, crc, mime, lenStr] = parts;
  if (magic !== MAGIC || ver !== PROTO_VERSION) return { valid: false };
  const index = Number(indexStr);
  const total = Number(totalStr);
  const len = Number(lenStr);
  if (!Number.isFinite(index) || !Number.isFinite(total) || !Number.isFinite(len)) {
    return { valid: false };
  }
  const data = parts.slice(8).join("|");
  return { valid: true, id, index, total, crc, mime, len, data };
}

/** Build every chunk for a full base64 payload. */
export function buildChunks(dataUrl: string): {
  chunks: string[];
  id: string;
  total: number;
  crc: string;
  mime: string;
  payload: string;
  bytes: number;
} {
  const [head, body] = dataUrl.split(",");
  const mimeKey = head.match(/data:(.*?)(;|$)/)?.[1] ?? "image/png";
  const mime = MIME_CODE[mimeKey] ?? "png";
  const payload = body;
  const crc = crcHex(payload);
  const total = Math.max(1, Math.ceil(payload.length / CHUNK_DATA_SIZE));
  const id = Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 36).toString(36).toUpperCase();
  const chunks: string[] = [];
  for (let i = 0; i < total; i++) {
    const data = payload.slice(i * CHUNK_DATA_SIZE, (i + 1) * CHUNK_DATA_SIZE);
    chunks.push(
      [MAGIC, PROTO_VERSION, id, String(i), String(total), crc, mime, String(payload.length), data].join("|"),
    );
  }
  return { chunks, id, total, crc, mime, payload, bytes: payload.length };
}
