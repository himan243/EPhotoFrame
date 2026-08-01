"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { AmbientBackground } from "@/components/motion/ambient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { clearConfigCache } from "@/lib/config";
import type { FrameEntry } from "@/types";
import { cn } from "@/lib/utils";

type Tab = "frames" | "branding" | "courses" | "departments" | "batches" | "themes";

const TABS: { id: Tab; label: string }[] = [
  { id: "frames", label: "Frames" },
  { id: "branding", label: "Branding" },
  { id: "courses", label: "Courses" },
  { id: "departments", label: "Departments" },
  { id: "batches", label: "Batches" },
  { id: "themes", label: "Themes" },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("frames");
  const [frames, setFrames] = useState<FrameEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshFrames = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/frames");
      const json = (await res.json()) as { frames: FrameEntry[] };
      setFrames(json.frames);
      clearConfigCache();
      toast("Frame library synced", "success");
    } catch {
      toast("Failed to sync frames", "error");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refreshFrames(), 0);
    return () => clearTimeout(t);
  }, [refreshFrames]);

  const toggleFrame = async (id: string) => {
    setFrames((f) => f.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
    setBusy(true);
    try {
      await rescanPreserving(frames.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
      toast("Updated", "success");
    } catch {
      toast("Sync failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteFrame = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/frames", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete failed");
      await refreshFrames();
      toast("Frame removed", "success");
    } catch {
      toast("Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const rescanPreserving = async (updatedFrames: FrameEntry[]) => {
    // write manifest through the rescan, which preserves enabled flags,
    // then patch the flags by re-running rescan is not enough — so we just
    // rely on rescan + a follow-up toggle persisted in a side manifest.
    await fetch("/api/admin/frames", { method: "POST" });
    await fetch("/api/admin/frames/flags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        flags: Object.fromEntries(updatedFrames.map((f) => [f.id, { enabled: f.enabled, opacity: f.opacity }])),
      }),
    });
    await refreshFrames();
  };

  return (
    <main className="relative min-h-screen">
      <AmbientBackground />
      <header className="relative z-30 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="iconSm" onClick={() => router.push("/")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-lg font-bold text-foreground">Local admin</h1>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1 text-[11px] font-semibold text-muted sm:flex">
          <Settings className="h-3.5 w-3.5" /> No login · stored on this machine
        </span>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-20">
        <div className="mb-6 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                tab === t.id ? "bg-accent text-ink shadow" : "text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "frames" && (
              <FramesTab frames={frames} busy={busy} onRefresh={refreshFrames} onToggle={toggleFrame} onDelete={deleteFrame} />
            )}
            {tab === "branding" && <JsonEditor kind="branding" />}
            {tab === "courses" && <JsonEditor kind="courses" />}
            {tab === "departments" && <JsonEditor kind="departments" />}
            {tab === "batches" && <JsonEditor kind="batches" />}
            {tab === "themes" && <JsonEditor kind="themes" />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ---------------- frames tab ---------------- */

function FramesTab({
  frames,
  busy,
  onRefresh,
  onToggle,
  onDelete,
}: {
  frames: FrameEntry[];
  busy: boolean;
  onRefresh: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useUploadInput(async (file, dataUrl) => {
    setUploading(true);
    try {
      const res = await fetch("/api/admin/frames/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: category || "Special", filename: file.name, data: dataUrl }),
      });
      if (!res.ok) throw new Error("upload failed");
      toast(`Added ${file.name}`, "success");
      onRefresh();
    } catch {
      toast("Upload failed — only .svg/.png allowed", "error");
    } finally {
      setUploading(false);
    }
  });

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
              New frame category (folder name)
            </label>
            <input className="input-soft" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Festival" />
          </div>
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading || busy}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload SVG / PNG
          </Button>
          <Button variant="ghost" onClick={onRefresh} disabled={busy} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} /> Rescan library
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Drop frame files into <code className="rounded bg-white/10 px-1 py-0.5">public/frames/…</code> or upload here.
          Any new file appears in the studio automatically after a rescan.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {frames.map((f) => (
          <Card key={f.id} className={cn("rounded-2xl p-3", !f.enabled && "opacity-50")}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-black/30">
              <Image src={f.path} alt={f.name} fill sizes="240px" className="object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {f.category}
              </span>
              {!f.enabled && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">
                  Hidden
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{f.name}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggle(f.id)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                    f.enabled ? "border-accent/50 bg-accent/10 text-accent-soft" : "border-line text-muted",
                  )}
                  aria-label={f.enabled ? "Hide frame" : "Show frame"}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(f.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-red-400/50 hover:text-red-300"
                  aria-label="Delete frame"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {frames.length === 0 && !busy && (
        <Card className="p-10 text-center text-sm text-muted">
          <ImageIcon className="mx-auto mb-3 h-10 w-10" />
          No frames found. Upload your first frame above.
        </Card>
      )}
    </div>
  );
}

function useUploadInput(handler: (file: File, dataUrl: string) => void) {
  const ref = { current: null as HTMLInputElement | null };
  const start = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".svg,.png";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => handler(file, reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
    ref.current = input;
  };
  return { current: { click: start } as unknown as { click: () => void }, handler };
}

/* ---------------- generic JSON editor ---------------- */

function JsonEditor({ kind }: { kind: string }) {
  const [value, setValue] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/config/${kind}.json`, { cache: "no-store" });
        const text = await res.text();
        if (alive) {
          setValue(JSON.stringify(JSON.parse(text), null, 2));
          setLoaded(true);
        }
      } catch {
        if (alive) {
          setValue("[]");
          setLoaded(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind]);

  const save = async () => {
    setSaving(true);
    try {
      JSON.parse(value); // validate
      const res = await fetch(`/api/config/${kind}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: value,
      });
      if (!res.ok) throw new Error("save failed");
      clearConfigCache();
      toast("Saved — the app picks it up on next visit", "success");
    } catch (e) {
      toast(e instanceof Error && e.message.includes("JSON") ? "Invalid JSON" : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <Card className="flex items-center gap-3 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Palette className="h-4 w-4 text-accent" />
          Editing <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">/config/{kind}.json</code>
        </p>
        <Button onClick={() => void save()} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
        className="input-soft h-[52vh] resize-y font-mono text-xs leading-relaxed"
        aria-label={`Edit ${kind} config`}
      />
      <p className="mt-3 text-xs text-muted">
        Schema: see the corresponding file in <code className="rounded bg-white/10 px-1 py-0.5">public/config/</code>.
        Invalid JSON is rejected on save.
      </p>
    </Card>
  );
}
