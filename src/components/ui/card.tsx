import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { strong?: boolean }
>(({ className, strong, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(strong ? "glass-strong" : "glass", "rounded-3xl", className)}
    {...props}
  />
));
Card.displayName = "Card";

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted",
        className,
      )}
      {...props}
    />
  );
}
