import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Adjustments, FrameEntry, PhotoTheme } from "@/types";

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 104,
  saturation: 108,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  warm: 0,
  cool: 0,
  vignette: 0,
};

interface EditState {
  photo: string | null;
  adjustments: Adjustments;
  theme: PhotoTheme | null;
  frame: FrameEntry | null;
  frameOpacity: number;
  name: string;
  nickname: string;
  courseId: string | null;
  departmentId: string | null;
  batchId: string | null;
  fontFamily: string;
  fontWeight: number;
  fontColor: string;
  showText: boolean;
  setPhoto: (p: string | null) => void;
  setAdjustments: (a: Partial<Adjustments>) => void;
  resetAdjustments: () => void;
  setTheme: (t: PhotoTheme | null) => void;
  setFrame: (f: FrameEntry | null) => void;
  setFrameOpacity: (o: number) => void;
  setName: (v: string) => void;
  setNickname: (v: string) => void;
  setCourseId: (v: string | null) => void;
  setDepartmentId: (v: string | null) => void;
  setBatchId: (v: string | null) => void;
  setFontFamily: (v: string) => void;
  setFontWeight: (v: number) => void;
  setFontColor: (v: string) => void;
  setShowText: (v: boolean) => void;
}

export const useEditStore = create<EditState>()(
  persist(
    (set) => ({
      photo: null,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      theme: null,
      frame: null,
      frameOpacity: 100,
      name: "",
      nickname: "",
      courseId: null,
      departmentId: null,
      batchId: null,
      fontFamily: "Space Grotesk",
      fontWeight: 600,
      fontColor: "#ffffff",
      showText: true,
      setPhoto: (photo) => set({ photo }),
      setAdjustments: (adj) =>
        set((s) => ({ adjustments: { ...s.adjustments, ...adj } })),
      resetAdjustments: () => set({ adjustments: { ...DEFAULT_ADJUSTMENTS } }),
      setTheme: (theme) => set({ theme }),
      setFrame: (frame) => set({ frame }),
      setFrameOpacity: (frameOpacity) => set({ frameOpacity }),
      setName: (name) => set({ name }),
      setNickname: (nickname) => set({ nickname }),
      setCourseId: (courseId) => set({ courseId }),
      setDepartmentId: (departmentId) => set({ departmentId }),
      setBatchId: (batchId) => set({ batchId }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontWeight: (fontWeight) => set({ fontWeight }),
      setFontColor: (fontColor) => set({ fontColor }),
      setShowText: (showText) => set({ showText }),
    }),
    { name: "sunstone-edit-v1" },
  ),
);

interface TransferStore {
  payload: string | null;
  formatId: string;
  formatName: string;
  width: number;
  height: number;
  setPayload: (payload: string, format: { id: string; name: string; width: number; height: number }) => void;
  clear: () => void;
}

export const useTransferStore = create<TransferStore>()((set) => ({
  payload: null,
  formatId: "post",
  formatName: "Instagram Post",
  width: 1080,
  height: 1080,
  setPayload: (payload, f) =>
    set({ payload, formatId: f.id, formatName: f.name, width: f.width, height: f.height }),
  clear: () => set({ payload: null }),
}));

interface AppState {
  badges: string[];
  addBadge: (b: string) => void;
  goldenUnlocked: boolean;
  unlockGolden: () => void;
  logoTaps: number;
  tapLogo: () => void;
  transferComplete: boolean;
  setTransferComplete: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      badges: [],
      addBadge: (b) =>
        set((s) => (s.badges.includes(b) ? s : { badges: [...s.badges, b] })),
      goldenUnlocked: false,
      unlockGolden: () => set({ goldenUnlocked: true }),
      logoTaps: 0,
      tapLogo: () =>
        set((s) => {
          const taps = s.logoTaps + 1;
          if (taps === 5 && !s.goldenUnlocked) {
            setTimeout(() => set({ goldenUnlocked: true, logoTaps: 0 }), 50);
            return { logoTaps: taps };
          }
          if (taps >= 5) return { logoTaps: 0 };
          return { logoTaps: taps };
        }),
      transferComplete: false,
      setTransferComplete: (v) => set({ transferComplete: v }),
    }),
    { name: "sunstone-app-v1" },
  ),
);
