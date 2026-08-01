"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, FabricImage, Textbox, util, Point, type FabricObject } from "fabric";
import {
  ArrowLeft,
  BadgeCheck,
  Download,
  Frame as FrameIcon,
  LayoutTemplate,
  Plus,
  Redo2,
  Sparkles,
  Sun,
  Type,
  Undo2,
  Copy,
  Trash2,
  ImagePlus,
  Wand2,
} from "lucide-react";
import { AmbientBackground } from "@/components/motion/ambient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/toast";
import { loadFrames, loadCourses, loadDepartments, loadBatches, loadThemes, categoryIcon } from "@/lib/config";
import { useEditStore } from "@/lib/store";
import { useTransferStore } from "@/lib/store";
import { useAppStore } from "@/lib/store";
import { bakePhotoLayer, loadImage, OUTPUT_FORMATS, getFormat } from "@/lib/image";
import { groupFrames } from "@/lib/frames";
import { downloadDataUrl, cn } from "@/lib/utils";
import type { Batch, Course, Department, FrameEntry, OutputFormat, PhotoTheme } from "@/types";

const BASE_W = 720;
const EDITABLE_KINDS = ["name", "nickname", "sticker"];
const FONT_OPTIONS = ["Space Grotesk", "Inter", "Playfair Display", "Poppins", "Dancing Script"];
const FONT_WEIGHTS = [400, 500, 600, 700, 800];

const FONT_COLORS = ["#ffffff", "#0b1022", "#e3c374", "#c9a24b", "#22d3ee", "#a78bfa", "#f472b6", "#4ade80", "#f87171"];

type Tab = "frames" | "text" | "details" | "theme" | "export";

function isEditable(o: FabricObject): boolean {
  const kind = (o as FabricObject & { data?: { kind?: string } }).data?.kind;
  return kind != null && EDITABLE_KINDS.includes(kind);
}

export default function Editor() {
  const router = useRouter();
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fcRef = useRef<Canvas | null>(null);
  const bgRef = useRef<FabricImage | null>(null);
  const frameImgRef = useRef<FabricImage | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("frames");
  const [format, setFormat] = useState<OutputFormat>(OUTPUT_FORMATS[1]);
  const [frames, setFrames] = useState<FrameEntry[]>([]);
  const [themes, setThemes] = useState<PhotoTheme[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const store = useEditStore();
  const transfer = useTransferStore();
  const goldenUnlocked = useAppStore((s) => s.goldenUnlocked);

  const photo = store.photo;
  const adjustments = store.adjustments;
  const theme = store.theme;
  const frame = store.frame;
  const frameOpacity = store.frameOpacity;
  const name = store.name;
  const nickname = store.nickname;
  const courseId = store.courseId;
  const departmentId = store.departmentId;
  const batchId = store.batchId;
  const fontFamily = store.fontFamily;
  const fontWeight = store.fontWeight;
  const fontColor = store.fontColor;
  const showText = store.showText;

  const canvasH = Math.round((BASE_W * format.height) / format.width);

  /* ---------------- config load ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [f, t, c, d, b] = await Promise.all([
        loadFrames(),
        loadThemes(),
        loadCourses(),
        loadDepartments(),
        loadBatches(),
      ]);
      if (!alive) return;
      setFrames(f);
      setThemes(t);
      setCourses(c);
      setDepartments(d);
      setBatches(b);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const snapshotJSON = (canvas: Canvas): string => {
    const objs = canvas.getObjects().filter(isEditable).map((o) => o.toObject(["data"]));
    return JSON.stringify(objs);
  };

  const fitCanvas = useCallback((canvas: Canvas) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const scale = wrap.clientWidth / BASE_W;
    canvas.setZoom(scale);
    canvas.setDimensions({ width: BASE_W, height: canvas.height });
    canvas.absolutePan(new Point(0, 0));
  }, []);

  /* ---------------- fabric init ---------------- */
  useEffect(() => {
    if (!canvasElRef.current) return;

    try {
      const canvas = new Canvas(canvasElRef.current, {
        width: BASE_W,
        height: canvasH,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
        selection: true,
      });
      canvas.selectionColor = "rgba(227,195,116,0.18)";
      canvas.selectionBorderColor = "rgba(227,195,116,0.8)";
      fcRef.current = canvas;
      fitCanvas(canvas);

      const onSel = () => {
        const active = canvas.getActiveObject();
        setSelected(active && isEditable(active) ? active : null);
      };
      canvas.on("selection:created", onSel);
      canvas.on("selection:updated", onSel);
      canvas.on("selection:cleared", () => setSelected(null));

      // snapping
      canvas.on("object:moving", (e) => {
        const o = e.target;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const left = o.left ?? 0;
        const top = o.top ?? 0;
        if (Math.abs(left - cx) < 6) o.left = cx;
        if (Math.abs(top - cy) < 6) o.top = cy;
      });

      // history
      const pushHistory = () => {
        if (historyIdxRef.current < historyRef.current.length - 1) {
          historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        }
        historyRef.current.push(snapshotJSON(canvas));
        if (historyRef.current.length > 40) historyRef.current.shift();
        historyIdxRef.current = historyRef.current.length - 1;
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(false);
      };
      canvas.on("object:modified", (e) => {
        if (isEditable(e.target)) pushHistory();
      });
      canvas.on("object:added", (e) => {
        if (isEditable(e.target)) pushHistory();
      });
      canvas.on("object:removed", (e) => {
        if (isEditable(e.target)) pushHistory();
      });

      const onResize = () => fitCanvas(canvas);
      window.addEventListener("resize", onResize);
      setReady(true);
      setInitError(null);
      return () => {
        window.removeEventListener("resize", onResize);
        canvas.dispose();
        fcRef.current = null;
      };
    } catch (error) {
      console.error("Fabric canvas init failed", error);
      setInitError(error instanceof Error ? error.message : "The studio could not start.");
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = fcRef.current;
    if (!canvas) return;
    fitCanvas(canvas);
  }, [format, fitCanvas]);

  /* ---------------- bake background ---------------- */
  useEffect(() => {
    const canvas = fcRef.current;
    if (!canvas || !photo) return;
    let cancelled = false;
    (async () => {
      const baked = await bakePhotoLayer({
        width: BASE_W,
        height: canvas.height,
        photo,
        adjustments,
        theme,
      });
      if (cancelled) return;
      const img = await FabricImage.fromURL(baked.toDataURL("image/png"), { crossOrigin: "anonymous" });
      if (cancelled) return;
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        objectCaching: false,
      });
      img.scaleToWidth(BASE_W);
      if (bgRef.current) canvas.remove(bgRef.current);
      canvas.insertAt(0, img);
      bgRef.current = img;
      canvas.requestRenderAll();
    })();
    return () => {
      cancelled = true;
    };
  }, [photo, adjustments, theme, canvasH]);

  /* ---------------- frame overlay ---------------- */
  useEffect(() => {
    const canvas = fcRef.current;
    if (!canvas) return;
    let cancelled = false;
    (async () => {
      if (frameImgRef.current) {
        canvas.remove(frameImgRef.current);
        frameImgRef.current = null;
      }
      if (!frame) {
        canvas.requestRenderAll();
        return;
      }
      const img = await FabricImage.fromURL(frame.path, { crossOrigin: "anonymous" });
      if (cancelled) return;
      img.set({
        selectable: false,
        evented: false,
        objectCaching: false,
        opacity: frameOpacity / 100,
      });
      const scale = Math.max(BASE_W / (img.width || BASE_W), canvas.height / (img.height || canvas.height));
      img.scaleX = scale;
      img.scaleY = scale;
      img.left = BASE_W / 2;
      img.top = canvas.height / 2;
      img.set({ originX: "center", originY: "center" });
      canvas.add(img);
      frameImgRef.current = img;
      canvas.requestRenderAll();
    })();
    return () => {
      cancelled = true;
    };
  }, [frame, frameOpacity, canvasH]);

  /* ---------------- fonts ready ---------------- */
  useEffect(() => {
    document.fonts?.ready
      .then(() => {
        setFontLoaded(true);
        void Promise.all(FONT_OPTIONS.map((f) => document.fonts.load(`600 48px ${f}`)));
      })
      .catch(() => setFontLoaded(true));
  }, []);

  /* ---------------- seed text objects ---------------- */
  const seedTexts = useCallback(() => {
    const canvas = fcRef.current;
    if (!canvas || !fontLoaded) return;
    const existing = canvas.getObjects().some((o) => isEditable(o));
    if (existing) return;

    const addObj = (o: FabricObject) => {
      o.set({ cornerColor: "#e3c374", cornerStrokeColor: "#e3c374", cornerStyle: "circle", transparentCorners: false, borderColor: "#e3c374" });
      canvas.add(o);
    };

    if (name && showText) {
      const t = new Textbox(name, {
        left: BASE_W / 2,
        top: canvas.height * 0.07,
        width: BASE_W * 0.7,
        fontSize: 52,
        fontFamily,
        fontWeight,
        fill: fontColor,
        textAlign: "center",
        originX: "center",
        originY: "center",
        data: { kind: "name" },
      });
      addObj(t);
    }
    if (nickname && showText) {
      const t = new Textbox(nickname, {
        left: BASE_W / 2,
        top: canvas.height * 0.15,
        width: BASE_W * 0.6,
        fontSize: 34,
        fontFamily,
        fontWeight: 500,
        fill: fontColor,
        textAlign: "center",
        originX: "center",
        originY: "center",
        data: { kind: "nickname" },
      });
      addObj(t);
    }
    canvas.requestRenderAll();
  }, [fontLoaded, name, nickname, showText, fontFamily, fontWeight, fontColor]);

  useEffect(() => {
    seedTexts();
  }, [seedTexts]);

  /* ---------------- sync store -> fabric text ---------------- */
  const syncText = useCallback((kind: "name" | "nickname", value: string) => {
    const canvas = fcRef.current;
    if (!canvas) return;
    const obj = canvas.getObjects().find((o) => (o as FabricObject & { data?: { kind?: string } }).data?.kind === kind);
    if (obj instanceof Textbox) {
      (obj as Textbox).text = value;
      obj.setCoords();
      canvas.requestRenderAll();
    }
  }, []);

  useEffect(() => {
    syncText("name", name);
  }, [name, syncText]);
  useEffect(() => {
    syncText("nickname", nickname);
  }, [nickname, syncText]);

  useEffect(() => {
    const canvas = fcRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((o) => {
      if (!isEditable(o)) return;
      o.set({ visible: showText });
    });
    canvas.requestRenderAll();
  }, [showText]);

  useEffect(() => {
    const canvas = fcRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((o) => {
      const kind = (o as FabricObject & { data?: { kind?: string } }).data?.kind;
      if (kind === "name" || kind === "nickname") {
        o.set({ fontFamily, fontWeight, fill: fontColor });
      }
    });
    canvas.requestRenderAll();
  }, [fontFamily, fontWeight, fontColor]);

  /* ---------------- history ---------------- */
  const restoreJSON = useCallback((json: string) => {
    const canvas = fcRef.current;
    if (!canvas) return;
    const current = canvas.getObjects().filter(isEditable);
    current.forEach((o) => canvas.remove(o));
    let data: Record<string, unknown>[] = [];
    try {
      data = JSON.parse(json);
    } catch {
      return;
    }
    void util.enlivenObjects(data).then((objs) => {
      (objs as FabricObject[]).forEach((o) => {
        o.set({ cornerColor: "#e3c374", cornerStrokeColor: "#e3c374", cornerStyle: "circle", transparentCorners: false, borderColor: "#e3c374" });
        canvas.add(o);
      });
      canvas.requestRenderAll();
    });
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    restoreJSON(historyRef.current[historyIdxRef.current]);
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
  }, [restoreJSON]);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    restoreJSON(historyRef.current[historyIdxRef.current]);
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, [restoreJSON]);

  /* ---------------- object ops ---------------- */
  const deleteSelected = useCallback(() => {
    const canvas = fcRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && isEditable(active)) {
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setSelected(null);
    }
  }, []);

  const duplicateSelected = useCallback(() => {
    const canvas = fcRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || !isEditable(active)) return;
    active.clone().then((clone: FabricObject) => {
      clone.set({ left: (active.left ?? 0) + 24, top: (active.top ?? 0) + 24, data: (active as FabricObject & { data?: unknown }).data });
      canvas.add(clone);
      canvas.setActiveObject(clone);
      canvas.requestRenderAll();
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, undo, redo]);

  /* ---------------- add sticker ---------------- */
  const stickerDrop = useRef(0);
  const addSticker = (emoji: string) => {
    const canvas = fcRef.current;
    if (!canvas) return;
    const offset = ((emoji.length * 7 + stickerDrop.current * 13) % 121) - 60;
    stickerDrop.current += 1;
    const t = new Textbox(emoji, {
      left: BASE_W / 2 + offset,
      top: canvas.height / 2 + (((offset * 3) % 81) - 40),
      fontSize: 72,
      width: 140,
      textAlign: "center",
      originX: "center",
      originY: "center",
      data: { kind: "sticker" },
    });
    t.set({ cornerColor: "#e3c374", cornerStrokeColor: "#e3c374", cornerStyle: "circle", transparentCorners: false, borderColor: "#e3c374" });
    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.requestRenderAll();
  };

  /* ---------------- export ---------------- */
  const runExport = useCallback(
    async (toTransfer: boolean) => {
      const canvas = fcRef.current;
      if (!canvas || !photo) return;
      setExporting(true);
      try {
        const final = document.createElement("canvas");
        final.width = format.width;
        final.height = format.height;
        const ctx = final.getContext("2d")!;

        const base = await bakePhotoLayer({
          width: format.width,
          height: format.height,
          photo,
          adjustments,
          theme,
        });
        ctx.drawImage(base, 0, 0);

        if (frame) {
          const frameImg = await loadImage(frame.path);
          const scale = Math.max(format.width / frameImg.naturalWidth, format.height / frameImg.naturalHeight);
          const dw = frameImg.naturalWidth * scale;
          const dh = frameImg.naturalHeight * scale;
          ctx.save();
          ctx.globalAlpha = frameOpacity / 100;
          ctx.drawImage(frameImg, (format.width - dw) / 2, (format.height - dh) / 2, dw, dh);
          ctx.restore();
        }

        if (bgRef.current) bgRef.current.visible = false;
        if (frameImgRef.current) frameImgRef.current.visible = false;
        const layer = canvas.toCanvasElement(format.width / BASE_W);
        if (bgRef.current) bgRef.current.visible = true;
        if (frameImgRef.current) frameImgRef.current.visible = true;
        ctx.drawImage(layer, 0, 0);

        const mime = format.id === "transparent" ? "image/png" : "image/jpeg";
        const quality = format.id === "transparent" ? undefined : 0.92;
        const dataUrl = final.toDataURL(mime, quality);

        if (toTransfer) {
          transfer.setPayload(dataUrl, format);
          router.push("/transfer");
        } else {
          downloadDataUrl(dataUrl, `sunstone-freshers-${format.id}.${format.id === "transparent" ? "png" : "jpg"}`);
          toast("Saved to downloads", "success");
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : "Export failed", "error");
      } finally {
        setExporting(false);
      }
    },
    [photo, adjustments, theme, frame, frameOpacity, format, transfer, router],
  );

  const groupedFrames = groupFrames(frames);
  const courseObj = courses.find((c) => c.id === courseId);
  const deptObj = departments.find((d) => d.id === departmentId);
  const batchObj = batches.find((b) => b.id === batchId);

  return (
    <main className="relative min-h-screen">
      <AmbientBackground />
      {!ready && (
        <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b1022]/80 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
          <p className="text-sm text-muted">Warming up the studio…</p>
        </div>
      )}
      {initError && (
        <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#0b1022]/80 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 text-center shadow-brand">
            <p className="font-display text-xl font-semibold text-foreground">The studio hit a snag</p>
            <p className="mt-2 text-sm text-muted">{initError}</p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      )}
      {/* header */}
      <header className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="iconSm" onClick={() => router.push("/capture")} aria-label="Back to capture">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-lg font-bold text-foreground">Your frame studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void runExport(false)} disabled={exporting}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button size="sm" onClick={() => void runExport(true)} disabled={exporting} className="gap-2">
            {exporting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink" /> : <Sparkles className="h-4 w-4" />}
            Beam to phone
          </Button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1400px] gap-6 px-5 pb-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8">
        {/* canvas column */}
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <FormatPicker format={format} setFormat={(f) => setFormat(f)} />
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="iconSm" onClick={undo} disabled={!canUndo} aria-label="Undo">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="iconSm" onClick={redo} disabled={!canRedo} aria-label="Redo">
                <Redo2 className="h-4 w-4" />
              </Button>
              {selected && (
                <>
                  <Button variant="ghost" size="iconSm" onClick={duplicateSelected} aria-label="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="danger" size="iconSm" onClick={deleteSelected} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="glass-strong relative rounded-[2rem] p-4 shadow-brand sm:p-6">
            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            <div ref={wrapRef} className="mx-auto w-full max-w-[460px]">
              <div style={{ aspectRatio: `${format.width} / ${format.height}` }}>
                <canvas ref={canvasElRef} className="w-full rounded-2xl" />
              </div>
            </div>
            {!photo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-black/60">
                <ImagePlus className="h-10 w-10 text-muted" />
                <p className="text-sm text-muted">No photo yet — capture one first</p>
                <Button onClick={() => router.push("/capture")}>Go capture</Button>
              </div>
            )}
            {selected && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-accent-soft backdrop-blur">
                Drag · scale · rotate
                <span className="text-muted">|</span>
                {(selected as FabricObject & { data?: { kind?: string } }).data?.kind === "sticker" ? "Sticker" : "Text"}
              </div>
            )}
          </div>

          {/* frame opacity */}
          <Card className="mt-4 rounded-2xl p-4">
            <Slider
              label="Frame intensity"
              value={frameOpacity}
              valueLabel={`${frameOpacity}%`}
              min={0}
              max={100}
              onChange={(e) => store.setFrameOpacity(Number(e.target.value))}
            />
          </Card>
        </div>

        {/* controls column */}
        <div className="space-y-4">
          <Tabs tab={tab} setTab={setTab} />

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
            >
              {tab === "frames" && (
                <div className="max-h-[62vh] space-y-5 overflow-y-auto pr-1">
                  {groupedFrames.length === 0 && (
                    <Card className="p-6 text-center text-sm text-muted">
                      No frames yet. Add frames in /admin or drop SVGs into public/frames.
                    </Card>
                  )}
                  {groupedFrames.map((g) => (
                    <div key={g.category}>
                      <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted">
                        <span>{categoryIcon(g.category)}</span> {g.category}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {g.frames.map((f) => {
                          const isGolden = f.name.toLowerCase().includes("golden");
                          const locked = isGolden && !goldenUnlocked;
                          const active = store.frame?.id === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              disabled={locked}
                              onClick={() => store.setFrame(active ? null : f)}
                              className={cn(
                                "group relative aspect-[4/5] overflow-hidden rounded-xl border transition-all",
                                active
                                  ? "border-accent shadow-[0_0_0_2px_rgba(201,162,75,0.5)]"
                                  : "border-line hover:border-accent/40",
                                locked && "cursor-not-allowed opacity-40",
                              )}
                            >
                              <Image src={f.path} alt={f.name} fill sizes="160px" className="object-cover" loading="lazy" />
                              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-center text-[10px] font-semibold text-white">
                                {f.name}
                              </span>
                              {locked && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs">🔒</span>}
                              {active && <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-[10px] font-black text-ink">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "text" && (
                <div className="space-y-4">
                  <Card className="space-y-4 p-5">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Your name</label>
                      <input className="input-soft" value={name} onChange={(e) => store.setName(e.target.value)} placeholder="e.g. Aarav Sharma" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Nickname</label>
                      <input className="input-soft" value={nickname} onChange={(e) => store.setNickname(e.target.value)} placeholder="e.g. Sparky" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" checked={showText} onChange={(e) => store.setShowText(e.target.checked)} className="accent-[#c9a24b]" />
                      Show name on poster
                    </label>
                  </Card>

                  <Card className="space-y-3 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Font</p>
                    <div className="flex flex-wrap gap-1.5">
                      {FONT_OPTIONS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => store.setFontFamily(f)}
                          className={cn(
                            "btn-ghost rounded-lg px-2.5 py-1.5 text-xs",
                            fontFamily === f && "border-accent text-accent-soft",
                          )}
                          style={{ fontFamily: f }}
                        >
                          {f.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Weight</p>
                    <div className="flex flex-wrap gap-1.5">
                      {FONT_WEIGHTS.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => store.setFontWeight(w)}
                          className={cn("btn-ghost rounded-lg px-2.5 py-1.5 text-xs", fontWeight === w && "border-accent text-accent-soft")}
                          style={{ fontWeight: w }}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Color</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {FONT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Color ${c}`}
                          onClick={() => store.setFontColor(c)}
                          className={cn(
                            "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                            fontColor === c ? "border-accent-soft" : "border-white/20",
                          )}
                          style={{ background: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => store.setFontColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded-lg border border-white/20 bg-transparent"
                        aria-label="Custom text color"
                      />
                    </div>
                  </Card>
                </div>
              )}

              {tab === "details" && (
                <div className="space-y-4">
                  <DetailSelect label="Course" options={courses.map((c) => ({ value: c.id, label: c.short }))} value={courseId} onChange={(v) => store.setCourseId(v)} placeholder="Choose your course" />
                  <DetailSelect label="Department" options={departments.map((d) => ({ value: d.id, label: d.short }))} value={departmentId} onChange={(v) => store.setDepartmentId(v)} placeholder="Choose department" />
                  <DetailSelect label="Batch" options={batches.map((b) => ({ value: b.id, label: b.label }))} value={batchId} onChange={(v) => store.setBatchId(v)} placeholder="Choose batch" />
                  <Card className="p-4 text-xs text-muted">
                    <p className="mb-1 font-semibold text-accent-soft">Preview chip:</p>
                    <p className="rounded-xl border border-line bg-black/30 px-3 py-2 text-sm text-foreground">
                      {[name || "Your Name", courseObj?.short, deptObj?.short, batchObj?.label].filter(Boolean).join(" · ") || "Add your details"}
                    </p>
                  </Card>
                </div>
              )}

              {tab === "theme" && (
                <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => store.setTheme(theme?.id === t.id ? null : t)}
                        className={cn(
                          "relative aspect-[4/3] overflow-hidden rounded-xl border text-left transition-all",
                          theme?.id === t.id ? "border-accent shadow-[0_0_0_2px_rgba(201,162,75,0.5)]" : "border-line hover:border-accent/40",
                        )}
                      >
                        <ThemeSwatch theme={t} />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4 text-[11px] font-semibold text-white">
                          {t.name}
                        </span>
                        {t.kind === "transparent" && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">PNG</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <Card className="p-4 text-xs leading-relaxed text-muted">
                    The background sits behind your portrait. Transparent keeps a clean cut-out for PNG export.
                  </Card>
                </div>
              )}

              {tab === "export" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted">Choose the output size, then download or beam to a phone.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {OUTPUT_FORMATS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all",
                          format.id === f.id ? "border-accent bg-accent/10" : "border-line hover:border-accent/40",
                        )}
                      >
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <LayoutTemplate className="h-3.5 w-3.5 text-accent" /> {f.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">{f.width}×{f.height}</p>
                      </button>
                    ))}
                  </div>
                  <Card className="space-y-3 p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><BadgeCheck className="h-4 w-4 text-accent" /> All rendering is local</p>
                    <div className="space-y-2 text-xs text-muted">
                      <p>• Images stay on this device.</p>
                      <p>• No servers, no cloud, no data sent anywhere.</p>
                      <p>• JPEG for photos · PNG when transparent is needed.</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="ghost" className="flex-1" onClick={() => void runExport(false)} disabled={exporting}>
                        <Download className="h-4 w-4" /> Download
                      </Button>
                      <Button className="flex-1" onClick={() => void runExport(true)} disabled={exporting}>
                        <Sparkles className="h-4 w-4" /> Beam via light
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* sticker quick bar */}
          <Card className="rounded-2xl p-4">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted">
              <Plus className="h-3.5 w-3.5" /> Tap to add sticker
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["✨", "🎉", "🎓", "⭐", "💙", "🚀", "🔥", "👑", "🌈", "💎", "🎯", "🏆"].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => addSticker(e)}
                  className="glass-hover flex h-10 w-10 items-center justify-center rounded-xl border border-line text-lg transition-transform hover:scale-110"
                >
                  {e}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

/* ================= helper components ================= */

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "frames", label: "Frames", icon: <FrameIcon className="h-4 w-4" /> },
    { id: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
    { id: "details", label: "Details", icon: <BadgeCheck className="h-4 w-4" /> },
    { id: "theme", label: "Theme", icon: <Sun className="h-4 w-4" /> },
    { id: "export", label: "Export", icon: <Wand2 className="h-4 w-4" /> },
  ];
  return (
    <div className="glass flex items-center gap-1 rounded-2xl p-1.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all",
            tab === t.id ? "bg-accent/15 text-accent-soft shadow-[inset_0_0_0_1px_rgba(201,162,75,0.35)]" : "text-muted hover:text-foreground",
          )}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function FormatPicker({ format, setFormat }: { format: OutputFormat; setFormat: (f: OutputFormat) => void }) {
  return (
    <div className="glass flex items-center gap-1 rounded-full p-1">
      {["post", "story", "square"].map((id) => {
        const f = getFormat(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => setFormat(f)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
              format.id === id ? "bg-accent text-ink shadow" : "text-muted hover:text-foreground",
            )}
          >
            {f.name}
          </button>
        );
      })}
    </div>
  );
}

function DetailSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</label>
      <select className="input-soft" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ThemeSwatch({ theme }: { theme: PhotoTheme }) {
  const colors = theme.colors.length ? theme.colors : ["#223669", "#0b1022"];
  if (theme.kind === "transparent") {
    return (
      <div className="absolute inset-0 bg-[conic-gradient(rgba(255,255,255,0.18)_25%,transparent_0_50%,rgba(255,255,255,0.18)_0_75%,transparent_0)] bg-[length:16px_16px]" />
    );
  }
  if (theme.kind === "solid") {
    return <div className="absolute inset-0" style={{ background: colors[0] }} />;
  }
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          colors.length > 2
            ? `radial-gradient(80% 80% at 30% 20%, ${colors[0]}, ${colors[1]} 45%, ${colors[2] ?? colors[1]})`
            : `linear-gradient(160deg, ${colors[0]}, ${colors[1] ?? colors[0]})`,
      }}
    >
      <div className="absolute left-1/2 top-1/3 h-10 w-14 -translate-x-1/2 rounded-full bg-white/20 blur-[2px]" />
    </div>
  );
}
