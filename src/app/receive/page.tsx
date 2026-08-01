"use client";

import dynamic from "next/dynamic";

const ReceiveScreen = dynamic(() => import("@/components/qr/receive-screen"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
        <p className="text-sm text-muted">Waking up the scanner…</p>
      </div>
    </div>
  ),
});

export default function ReceivePage() {
  return <ReceiveScreen />;
}
