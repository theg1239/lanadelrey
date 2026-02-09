"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Copy, Check, Code2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JsonViewerProps {
  data: unknown;
  title?: string;
}

export function JsonViewer({ data, title = "Response" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-3.5 w-3.5 text-muted-foreground/60" />
            <Badge variant="secondary" className="font-mono text-[10px] tracking-wider uppercase">
              {title}
            </Badge>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Copied!" : "Copy JSON"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <pre className="p-4 font-mono text-xs leading-relaxed text-foreground/70 whitespace-pre overflow-x-auto">
              {json}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
