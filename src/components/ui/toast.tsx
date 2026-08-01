"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";

interface Toast {
  id: number;
  message: string;
  tone: "default" | "success" | "error";
}

interface ToastStore {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = "default") => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, tone?: Toast["tone"]) {
  useToastStore.getState().push(message, tone);
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={() => dismiss(t.id)}
            role="status"
            className={`glass-strong pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium ${
              t.tone === "success"
                ? "text-accent-soft"
                : t.tone === "error"
                  ? "text-red-300"
                  : "text-foreground"
            }`}
          >
            <span className="text-base">{t.tone === "success" ? "✓" : t.tone === "error" ? "⚠" : "✦"}</span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
