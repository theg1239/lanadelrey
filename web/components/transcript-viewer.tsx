"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Clock, ChevronDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatMs, confidenceColor, confidenceLabel } from "@/lib/utils";
import type { Segment } from "@/lib/types";

interface TranscriptViewerProps {
  segments: Segment[];
}

export function TranscriptViewer({ segments }: TranscriptViewerProps) {
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <CardTitle className="font-serif text-base">Transcript</CardTitle>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {segments.length} segments
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <div className="divide-y divide-border/40">
              {segments.map((seg, i) => {
                const isExpanded = expandedSegment === i;

                return (
                  <Collapsible
                    key={i}
                    open={isExpanded}
                    onOpenChange={(open) =>
                      setExpandedSegment(open ? i : null)
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.5), duration: 0.3 }}
                        className={cn(
                          "group flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors",
                          "hover:bg-secondary/40",
                          isExpanded && "bg-secondary/60",
                        )}
                      >
                        {/* Timestamp */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                            {formatMs(seg.start_ms)}
                          </span>
                        </div>

                        {/* Text */}
                        <p className="flex-1 text-sm leading-relaxed text-foreground/90">
                          {seg.text}
                        </p>

                        {/* Confidence + expand */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "font-mono text-[10px] font-medium tabular-nums",
                              confidenceColor(seg.confidence),
                            )}
                          >
                            {(seg.confidence * 100).toFixed(0)}%
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200",
                              "opacity-0 group-hover:opacity-100",
                              isExpanded && "rotate-180 opacity-100",
                            )}
                          />
                        </div>
                      </motion.div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-3 pt-0">
                        <div className="ml-7 flex flex-wrap items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatMs(seg.start_ms)} → {formatMs(seg.end_ms)}
                          </span>
                          <Separator orientation="vertical" className="h-3" />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {seg.end_ms - seg.start_ms}ms
                          </span>
                          <Separator orientation="vertical" className="h-3" />
                          <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <Sparkles className="h-2.5 w-2.5" />
                            {seg.confidence.toFixed(3)}
                            <Badge
                              variant="outline"
                              className={cn(
                                "ml-1 text-[9px] px-1 py-0",
                                confidenceColor(seg.confidence),
                              )}
                            >
                              {confidenceLabel(seg.confidence)}
                            </Badge>
                          </span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
