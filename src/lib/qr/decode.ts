import type { ReceiveSession } from "@/types";
import { crc32, parseChunk, CODE_TO_MIME } from "./protocol";

/**
 * Receiver-side reassembly for animated QR streaming.
 * Chunks may arrive out of order or be re-read many times — every chunk is
 * idempotent, so duplicates are ignored and gaps are filled on later loops.
 */
export function createReceiver(): {
  handle(raw: string): "accepted" | "ignored" | "done" | "bad";
  session: () => ReceiveSession | null;
  complete(): string | null;
  reset(): void;
} {
  let session: ReceiveSession | null = null;

  function handle(raw: string): "accepted" | "ignored" | "done" | "bad" {
    const p = parseChunk(raw);
    if (!p.valid || p.index === undefined || p.total === undefined) return "bad";

    if (!session || session.id !== p.id) {
      session = {
        id: p.id!,
        total: p.total,
        checksum: p.crc!,
        mime: p.mime ?? "jpg",
        chunks: new Array<string | null>(p.total).fill(null),
        got: 0,
        done: false,
      };
    }

    const s = session;
    if (s.done) return "done";
    if (p.total !== s.total) return "ignored";

    if (s.chunks[p.index] == null) {
      s.chunks[p.index] = p.data ?? "";
      s.got += 1;
      if (s.got >= s.total) {
        s.done = true;
        return "done";
      }
      return "accepted";
    }
    return "ignored";
  }

  function complete(): string | null {
    if (!session || !session.done) return null;
    let full = "";
    for (const c of session.chunks) full += c ?? "";
    if (crc32(full).toString(16).padStart(8, "0") !== session.checksum) {
      // Corrupt reassembly — restart so the kiosk loop re-feeds everything.
      reset();
      return null;
    }
    const mime = CODE_TO_MIME[session.mime] ?? "image/jpeg";
    return `data:${mime};base64,${full}`;
  }

  function reset() {
    session = null;
  }

  function sessionState() {
    return session;
  }

  return { handle, session: sessionState, complete, reset };
}
