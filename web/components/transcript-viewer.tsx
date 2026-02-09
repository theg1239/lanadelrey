"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import { cn, formatMs, confidenceColor, confidenceLabel } from "@/lib/utils";
import type { Segment } from "@/lib/types";
interface TranscriptViewerProps {
    segments: Segment[];
}
export function TranscriptViewer({ segments }: TranscriptViewerProps) {
    const [expanded, setExpanded] = useState<number | null>(null);
    return (<div className="space-y-4">
      
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold tracking-tight">
          Transcript
        </h3>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {segments.length} segments
        </Badge>
      </div>

      
      <Card>
        <ScrollArea className="max-h-[calc(100dvh-280px)]">
          <CardContent className="p-0">
            {segments.map((seg, i) => {
            const isOpen = expanded === i;
            return (<div key={i}>
                  {i > 0 && <Separator />}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{
                    delay: Math.min(i * 0.02, 0.5),
                    duration: 0.3,
                }}>
                    <button type="button" onClick={() => setExpanded(isOpen ? null : i)} className={cn("group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors", "hover:bg-muted/50", isOpen && "bg-muted/70")}>
                      
                      <span className="font-mono text-[10px] text-muted-foreground/40 tabular-nums pt-1 w-5 shrink-0 text-right">
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-primary tabular-nums pt-0.5 shrink-0">
                              <Clock className="h-3 w-3"/>
                              {formatMs(seg.start_ms)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="font-mono text-xs">
                              {formatMs(seg.start_ms)} → {formatMs(seg.end_ms)}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      
                      <span className="flex-1 text-sm leading-relaxed text-foreground/90">
                        {seg.text}
                      </span>

                      
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <Badge variant="outline" className={cn("font-mono text-[10px] tabular-nums px-1.5 py-0", confidenceColor(seg.confidence))}>
                          {(seg.confidence * 100).toFixed(0)}%
                        </Badge>
                        <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground/30 transition-transform duration-200", isOpen && "rotate-90 text-muted-foreground")}/>
                      </div>
                    </button>

                    
                    <AnimatePresence>
                      {isOpen && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="flex items-center gap-3 px-4 pb-3 pl-[52px] flex-wrap">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {formatMs(seg.start_ms)} → {formatMs(seg.end_ms)}
                            </span>
                            <Separator orientation="vertical" className="h-3"/>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {seg.end_ms - seg.start_ms}ms
                            </span>
                            <Separator orientation="vertical" className="h-3"/>
                            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                              <Sparkles className="h-2.5 w-2.5"/>
                              confidence: {seg.confidence.toFixed(4)} (
                              {confidenceLabel(seg.confidence)})
                            </span>
                          </div>
                        </motion.div>)}
                    </AnimatePresence>
                  </motion.div>
                </div>);
        })}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>);
}
