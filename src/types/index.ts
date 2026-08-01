export interface BrandingConfig {
  eventName: string;
  shortName: string;
  tagline: string;
  year: string;
  logo: string;
  primary: string;
  primaryAlt: string;
  accent: string;
  accentAlt: string;
  ink: string;
  ice: string;
  background: string;
  glass: string;
  glassBorder: string;
  displayFont: string;
  bodyFont: string;
  heroTitle: string;
  heroSubtitle: string;
  footerText: string;
  confettiColors: string[];
}

export interface Course {
  id: string;
  name: string;
  short: string;
  icon?: string;
}

export interface Department {
  id: string;
  name: string;
  short: string;
  icon?: string;
}

export interface Batch {
  id: string;
  label: string;
  start: number;
  end: number;
}

export type ThemeKind =
  | "transparent"
  | "solid"
  | "gradient"
  | "stage"
  | "campus"
  | "glass"
  | "luxury";

export interface PhotoTheme {
  id: string;
  name: string;
  kind: ThemeKind;
  colors: string[];
  hidden?: boolean;
}

export interface Sticker {
  id: string;
  emoji: string;
  label: string;
}

export interface FrameEntry {
  id: string;
  name: string;
  category: string;
  path: string;
  type: "svg" | "png";
  enabled: boolean;
  opacity: number;
}

export interface FramesManifest {
  generatedAt: string;
  frames: FrameEntry[];
}

export type FrameCategory =
  | "Freshers"
  | "Batches"
  | "Courses"
  | "Departments"
  | "Themes"
  | "Festival"
  | "Special";

/** Native canvas filter adjustments applied before framing. */
export interface Adjustments {
  brightness: number; // 50–150 (100 = none)
  contrast: number; // 50–150
  saturation: number; // 0–200 (100 = none)
  hue: number; // -180..180
  blur: number; // 0–8 px
  grayscale: number; // 0–1
  sepia: number; // 0–1
  invert: number; // 0–1
  warm: number; // -1..1
  cool: number; // -1..1
  vignette: number; // 0–1
}

export interface OutputFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  hint?: string;
}

export interface PosterState {
  photo: string | null;
  adjustments: Adjustments;
  theme: PhotoTheme | null;
  frameId: string | null;
  frameOpacity: number;
  name: string;
  nickname: string;
  courseId: string | null;
  departmentId: string | null;
  batchId: string | null;
  fontFamily: string;
  fontWeight: number;
  fontColor: string;
  stickers: { emoji: string; x: number; y: number; size: number; rotation: number }[];
}

export interface TransferSession {
  chunks: string[];
  id: string;
  total: number;
  checksum: string;
  mime: string;
  payloadBytes: number;
}

export interface ReceiveSession {
  id: string;
  total: number;
  checksum: string;
  mime: string;
  chunks: (string | null)[];
  got: number;
  done: boolean;
}
