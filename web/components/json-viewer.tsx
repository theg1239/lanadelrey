"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold tracking-tight">
          {title}
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-7 gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="text-xs">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy JSON to clipboard</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Code */}
      <Card className="overflow-hidden">
        <ScrollArea className="max-h-[calc(100dvh-280px)]">
          <pre className="p-4 font-mono text-[12px] leading-[1.8] text-foreground/70 whitespace-pre overflow-x-auto">
            {json}
          </pre>
        </ScrollArea>
      </Card>
    </div>
  );
}
