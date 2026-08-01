"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  valueLabel?: string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, valueLabel, ...props }, ref) => (
    <label className={cn("block w-full select-none", className)}>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium uppercase tracking-wider text-muted">{label}</span>
          {valueLabel && <span className="font-semibold text-accent-soft">{valueLabel}</span>}
        </div>
      )}
      <input ref={ref} type="range" className="slider-soft" {...props} />
    </label>
  ),
);
Slider.displayName = "Slider";
