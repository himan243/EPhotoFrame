"use client";

import dynamic from "next/dynamic";

const TransferScreen = dynamic(() => import("@/components/qr/transfer-screen"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
        <p className="text-sm text-muted">Preparing the light beam…</p>
      </div>
    </div>
  ),
});

export default function TransferPage() {
  return <TransferScreen />;
}
