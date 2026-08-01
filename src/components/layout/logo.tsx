"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  src?: string;
  alt?: string;
  className?: string;
  grayscale?: boolean;
}

/**
 * The Sunstone brand mark. Renders the white version by default so it works on
 * the dark kiosk shell; `grayscale={false}` uses the original navy/gold colors.
 */
export function Logo({ src, alt = "Sunstone", className, grayscale = true }: LogoProps) {
  const img = src ?? (grayscale ? "/branding/logo-white.png" : "/branding/logo-color.png");
  return (
    <span className={cn("relative inline-flex shrink-0 items-center", className)}>
      <Image
        src={img}
        alt={alt}
        width={160}
        height={78}
        unoptimized
        className="h-auto w-full object-contain"
        draggable={false}
      />
    </span>
  );
}
