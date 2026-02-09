"use client";
import { motion } from "motion/react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { Clock, Globe, Hash, Languages } from "lucide-react";
interface ResultHeaderProps {
    recordingId: string;
    duration: number;
    language: string;
    segmentCount: number;
}
export function ResultHeader({ recordingId, duration, language, segmentCount, }: ResultHeaderProps) {
    const fields = [
        { icon: Hash, label: "ID", value: recordingId.slice(0, 10) },
        { icon: Clock, label: "Duration", value: formatDuration(duration) },
        { icon: Languages, label: "Language", value: language.toUpperCase() },
        { icon: Globe, label: "Segments", value: segmentCount.toString() },
    ];
    return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex items-center gap-4 overflow-x-auto">
      {fields.map((field, i) => {
            const Icon = field.icon;
            return (<div key={field.label} className="flex items-center gap-4 shrink-0">
            {i > 0 && (<Separator orientation="vertical" className="h-4"/>)}
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground"/>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {field.label}
                </span>
                <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
                  {field.value}
                </span>
              </div>
            </div>
          </div>);
        })}
    </motion.div>);
}
