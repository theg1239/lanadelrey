"use client";

import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileAudio, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, formatFileSize } from "@/lib/utils";
import type { UploadStatus } from "@/lib/types";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  status: UploadStatus;
  currentFile: File | null;
  onClear: () => void;
}

const ACCEPTED_TYPES = [
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
];

export function UploadZone({
  onFileSelect,
  status,
  currentFile,
  onClear,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const isProcessing = status === "uploading" || status === "transcribing";

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isProcessing && inputRef.current?.click()}
      className={cn(
        "relative cursor-pointer border-2 border-dashed transition-all duration-300",
        "flex flex-col items-center justify-center gap-5 p-14",
        "bg-card/40 backdrop-blur-sm hover:bg-card/60",
        isDragging && "border-primary bg-primary/[0.04] scale-[1.01]",
        !isDragging && "border-border/60",
        isProcessing && "pointer-events-none",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {currentFile ? (
          <motion.div
            key="file-info"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/60 ring-1 ring-accent-foreground/10">
                <FileAudio className="h-7 w-7 text-accent-foreground" />
              </div>
              {!isProcessing && status !== "done" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-card-foreground">
                {currentFile.name}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {formatFileSize(currentFile.size)}
              </p>
            </div>

            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-[200px] space-y-2"
              >
                <Progress value={status === "uploading" ? 30 : 65} className="h-1" />
                <div className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    {status === "uploading" ? "Uploading" : "Transcribing"}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="upload-prompt"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-secondary/50">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-card-foreground">
                Drop your audio file here
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {["WAV", "MP3", "OGG", "FLAC", "WebM"].map((fmt) => (
                <Badge
                  key={fmt}
                  variant="outline"
                  className="font-mono text-[10px] tracking-wider text-muted-foreground/60"
                >
                  {fmt}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
