import type { FrameEntry } from "@/types";
import { CATEGORY_ORDER } from "./config";

export function groupFrames(frames: FrameEntry[]): {
  category: string;
  frames: FrameEntry[];
}[] {
  const map = new Map<string, FrameEntry[]>();
  for (const f of frames) {
    if (!f.enabled) continue;
    const list = map.get(f.category) ?? [];
    list.push(f);
    map.set(f.category, list);
  }
  const order = [...CATEGORY_ORDER, ...Array.from(map.keys()).filter((k) => !CATEGORY_ORDER.includes(k))];
  return order
    .filter((c) => map.has(c) && map.get(c)!.length)
    .map((c) => ({ category: c, frames: map.get(c)! }));
}
