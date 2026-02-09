"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface WaveformProps {
  bars?: number;
  className?: string;
  active?: boolean;
}

export function Waveform({
  bars = 24,
  className,
  active = true,
}: WaveformProps) {
  const heights = useMemo(
    () => Array.from({ length: bars }, () => 6 + Math.random() * 18),
    [bars],
  );

  return (
    <div
      className={cn("flex items-end justify-center gap-[2px]", className)}
      aria-hidden
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className={cn(
            "w-[2px] rounded-full bg-primary/50 waveform-bar",
            !active && "!animate-none opacity-15",
          )}
          style={{
            height: `${h}px`,
            animationDelay: `${i * 0.04}s`,
          }}
        />
      ))}
    </div>
  );
}
