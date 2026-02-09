"use client";

import { motion } from "motion/react";
import { Clock, Hash, Languages, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDuration } from "@/lib/utils";

interface ResultHeaderProps {
  recordingId: string;
  duration: number;
  language: string;
  segmentCount: number;
}

export function ResultHeader({
  recordingId,
  duration,
  language,
  segmentCount,
}: ResultHeaderProps) {
  const stats = [
    {
      icon: Hash,
      label: "Recording",
      value: recordingId.slice(0, 12),
      mono: true,
    },
    {
      icon: Timer,
      label: "Duration",
      value: formatDuration(duration),
      mono: false,
    },
    {
      icon: Languages,
      label: "Language",
      value: language.toUpperCase(),
      mono: true,
    },
    {
      icon: Clock,
      label: "Segments",
      value: segmentCount.toString(),
      mono: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex flex-col gap-1 p-4"
              >
                <div className="flex items-center gap-1.5">
                  <stat.icon className="h-3 w-3 text-muted-foreground/60" />
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
                    {stat.label}
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold text-foreground truncate ${
                    stat.mono ? "font-mono" : ""
                  }`}
                >
                  {stat.value}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
