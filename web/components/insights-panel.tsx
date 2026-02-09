"use client";

import { motion } from "motion/react";
import { Target, Tag, AlertTriangle, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Insights } from "@/lib/types";

interface InsightsPanelProps {
  insights: Insights;
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Intent */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
                Intent
              </span>
              <CardTitle className="font-serif text-base mt-0.5">
                Classification
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="flex items-center gap-2.5">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-semibold text-foreground">
              {insights.intent.replace(/_/g, " ")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Entities */}
      {insights.entities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent ring-1 ring-accent-foreground/10">
                <Tag className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <div>
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
                  Entities
                </span>
                <CardTitle className="font-serif text-base mt-0.5">
                  Extracted Data
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {insights.entities.map((entity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                >
                  <Badge
                    variant="outline"
                    className="gap-2 px-3 py-1.5 text-sm"
                  >
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      {entity.type}
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="font-mono font-medium text-foreground">
                      {entity.currency && `${entity.currency} `}
                      {entity.value}
                    </span>
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Obligations */}
      {insights.obligations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 ring-1 ring-destructive/20">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div>
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
                  Obligations
                </span>
                <CardTitle className="font-serif text-base mt-0.5">
                  Commitments
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <ul className="space-y-3">
              {insights.obligations.map((ob, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span className="font-serif text-sm italic leading-relaxed text-foreground/80">
                    &ldquo;{ob.text}&rdquo;
                  </span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
