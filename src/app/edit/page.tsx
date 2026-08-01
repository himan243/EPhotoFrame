"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
        <p className="text-sm text-muted">Warming up the studio…</p>
      </div>
    </div>
  ),
});

export default function EditPage() {
  return <Editor />;
}
