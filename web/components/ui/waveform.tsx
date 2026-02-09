"use client";

import { cn } from "@/lib/utils";

interface WaveformProps {
  bars?: number;
  className?: string;
  active?: boolean;
}

export function Waveform({ bars = 24, className, active = true }: WaveformProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-center gap-[2px]",
        className,
      )}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-primary/60 waveform-bar",
            !active && "!animate-none opacity-30",
          )}
          style={{
            height: `${12 + Math.random() * 20}px`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}
