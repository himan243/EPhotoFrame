import { promises as fs } from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const CONFIG_DIR = path.join(PUBLIC_DIR, "config");
const FRAMES_DIR = path.join(PUBLIC_DIR, "frames");

export const ALLOWED_CONFIG_KINDS = [
  "branding",
  "courses",
  "departments",
  "batches",
  "themes",
  "stickers",
] as const;

export type ConfigKind = (typeof ALLOWED_CONFIG_KINDS)[number];

export function configPath(kind: string): string | null {
  if (!(ALLOWED_CONFIG_KINDS as readonly string[]).includes(kind)) return null;
  return path.join(CONFIG_DIR, `${kind}.json`);
}

export async function readConfig(kind: string): Promise<string | null> {
  const p = configPath(kind);
  if (!p) return null;
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

export async function writeConfig(kind: string, content: string): Promise<boolean> {
  const p = configPath(kind);
  if (!p) return false;
  try {
    // validate JSON before writing
    JSON.parse(content);
    await fs.writeFile(p, content, "utf8");
    return true;
  } catch {
    return false;
  }
}

export interface ScannedFrame {
  id: string;
  name: string;
  category: string;
  path: string;
  type: "svg" | "png";
  enabled: boolean;
  opacity: number;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function walkFrames(dir: string, base: string): Promise<ScannedFrame[]> {
  const out: ScannedFrame[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFrames(full, base)));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== ".svg" && ext !== ".png") continue;
      const rel = path.relative(base, full).split(path.sep).join("/");
      const category = path.relative(base, path.dirname(full)).split(path.sep).join("/") || "Special";
      const stem = path.basename(entry.name, ext);
      out.push({
        id: slugify(stem),
        name: stem.replace(/-/g, " "),
        category,
        path: `/frames/${rel}`,
        type: ext === ".png" ? "png" : "svg",
        enabled: true,
        opacity: 100,
      });
    }
  }
  return out;
}

const MANIFEST_PATH = path.join(CONFIG_DIR, "frames-manifest.json");

export async function rescanFrames(): Promise<{ frames: ScannedFrame[]; generatedAt: string }> {
  let prev: Record<string, { enabled: boolean; opacity: number }> = {};
  try {
    const existing = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as {
      frames: ScannedFrame[];
    };
    prev = Object.fromEntries(existing.frames.map((f) => [f.id, { enabled: f.enabled, opacity: f.opacity }]));
  } catch {
    /* no previous manifest */
  }

  const frames = (await walkFrames(FRAMES_DIR, FRAMES_DIR)).map((f) => ({
    ...f,
    enabled: prev[f.id]?.enabled ?? f.enabled,
    opacity: prev[f.id]?.opacity ?? f.opacity,
  }));

  const manifest = { generatedAt: new Date().toISOString(), frames };
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

export async function deleteFrame(id: string): Promise<boolean> {
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as { frames: ScannedFrame[] };
  } catch {
    return false;
  }
  const frame = manifest.frames.find((f) => f.id === id);
  if (!frame) return false;
  const abs = path.join(PUBLIC_DIR, frame.path);
  try {
    await fs.unlink(abs);
  } catch {
    /* file may be missing — still remove from manifest */
  }
  await rescanFrames();
  return true;
}

export async function saveUploadedFrame(category: string, filename: string, base64Body: string): Promise<boolean> {
  const safeCategory = slugify(category) || "special";
  const ext = path.extname(filename).toLowerCase();
  if (ext !== ".svg" && ext !== ".png") return false;
  const dir = path.join(FRAMES_DIR, safeCategory);
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, path.basename(filename).replace(/[^a-z0-9._-]/gi, "-"));
  const buf = Buffer.from(base64Body, "base64");
  await fs.writeFile(target, buf);
  await rescanFrames();
  return true;
}

export async function saveFrameFlags(
  flags: Record<string, { enabled: boolean; opacity: number }>,
): Promise<void> {
  let manifest: { frames: ScannedFrame[] };
  try {
    manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as { frames: ScannedFrame[] };
  } catch {
    manifest = await rescanFrames();
  }
  manifest.frames = manifest.frames.map((f) => {
    const flag = flags[f.id];
    return flag ? { ...f, enabled: flag.enabled, opacity: flag.opacity } : f;
  });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}
