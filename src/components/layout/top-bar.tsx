"use client";

import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { useAppStore } from "@/lib/store";
import { goldenRain } from "@/components/confetti";
import { toast } from "@/components/ui/toast";
import Link from "next/link";

export function TopBar({
  onLogo,
  className,
  children,
}: {
  onLogo?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const tapLogo = useAppStore((s) => s.tapLogo);
  const goldenUnlocked = useAppStore((s) => s.goldenUnlocked);

  const handleTap = () => {
    if (onLogo) {
      onLogo();
      return;
    }
    tapLogo();
    if (useAppStore.getState().goldenUnlocked && !goldenUnlocked) {
      goldenRain();
      toast("Easter egg found — Golden frame unlocked ✨");
    }
  };

  return (
    <header
      className={cn(
        "relative z-30 flex items-center justify-between gap-4 px-5 py-4 sm:px-8",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleTap}
        aria-label="Sunstone logo"
        className="flex items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-lg"
      >
        <Logo className="h-8 w-auto" />
      </button>
      <div className="flex items-center gap-2">
        <Link href="/receive" className="btn-ghost hidden h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold sm:inline-flex">
          <span aria-hidden>📲</span> Receive
        </Link>
        {children}
      </div>
    </header>
  );
}
