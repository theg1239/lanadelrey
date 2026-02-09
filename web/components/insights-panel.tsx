"use client";

import { motion } from "motion/react";
import { Target, Tag, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Insights } from "@/lib/types";

interface InsightsPanelProps {
  insights: Insights;
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg font-semibold tracking-tight">
        Insights
      </h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ─── Intent ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Intent
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-semibold text-foreground">
                  {insights.intent.replace(/_/g, " ")}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Entities ─── */}
        {insights.entities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
                    <Tag className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Entities
                  </CardTitle>
                  <Badge variant="secondary" className="ml-auto text-[10px] font-mono">
                    {insights.entities.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.entities.map((entity, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.04 }}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                      {entity.type}
                    </Badge>
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {entity.currency && `${entity.currency} `}
                      {entity.value}
                    </span>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Obligations ─── */}
        {insights.obligations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Obligations
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {insights.obligations.map((ob, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
