import type {
  Batch,
  BrandingConfig,
  Course,
  Department,
  FrameEntry,
  PhotoTheme,
  Sticker,
} from "@/types";

export const CONFIG_BASE = "/config";

const cache = new Map<string, unknown>();

export async function fetchJson<T>(url: string, bust = false): Promise<T> {
  const key = url;
  if (!bust && cache.has(key)) return cache.get(key) as T;
  const res = await fetch(url, { cache: bust ? "no-store" : "force-cache" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const json = (await res.json()) as T;
  cache.set(key, json);
  return json;
}

export function loadBranding(bust = false) {
  return fetchJson<BrandingConfig>(`${CONFIG_BASE}/branding.json`, bust);
}
export function loadCourses(bust = false) {
  return fetchJson<Course[]>(`${CONFIG_BASE}/courses.json`, bust);
}
export function loadDepartments(bust = false) {
  return fetchJson<Department[]>(`${CONFIG_BASE}/departments.json`, bust);
}
export function loadBatches(bust = false) {
  return fetchJson<Batch[]>(`${CONFIG_BASE}/batches.json`, bust);
}
export function loadThemes(bust = false) {
  return fetchJson<PhotoTheme[]>(`${CONFIG_BASE}/themes.json`, bust);
}
export function loadStickers(bust = false) {
  return fetchJson<Sticker[]>(`${CONFIG_BASE}/stickers.json`, bust);
}
export async function loadFrames(bust = false): Promise<FrameEntry[]> {
  const manifest = await fetchJson<{ frames: FrameEntry[] }>(
    `${CONFIG_BASE}/frames-manifest.json`,
    bust,
  );
  return manifest.frames;
}

export function clearConfigCache() {
  cache.clear();
}

export const CATEGORY_ORDER = [
  "Freshers",
  "Batches",
  "Courses",
  "Departments",
  "Themes",
  "Festival",
  "Special",
];

export function categoryIcon(category: string): string {
  const icons: Record<string, string> = {
    Freshers: "🎓",
    Batches: "📅",
    Courses: "📘",
    Departments: "🏛️",
    Themes: "🎨",
    Festival: "🎉",
    Special: "✨",
  };
  return icons[category] ?? "🖼️";
}
