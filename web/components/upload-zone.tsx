"use client";

import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileAudio, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        "relative cursor-pointer border-dashed transition-all duration-300",
        "flex flex-col items-center justify-center gap-5 p-10",
        isDragging && "border-primary bg-primary/5 scale-[1.01]",
        !isDragging && "hover:border-muted-foreground/30 hover:bg-muted/50",
        isProcessing && "pointer-events-none opacity-70",
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
            key="file"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <FileAudio className="h-6 w-6 text-primary" />
              </div>
              {!isProcessing && status !== "done" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                {currentFile.name}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatFileSize(currentFile.size)}
              </p>
            </div>

            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  {status === "uploading"
                    ? "Uploading…"
                    : "Processing audio…"}
                </span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                Drop your audio file here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>
            <div className="flex gap-1.5">
              {["WAV", "MP3", "OGG", "FLAC", "WebM"].map((f) => (
                <Badge key={f} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                  {f}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
