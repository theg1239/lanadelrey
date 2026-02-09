"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  AlertCircle,
  AudioWaveform,
  FileAudio,
  Braces,
  Lightbulb,
  Mic,
  Brain,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadZone } from "@/components/upload-zone";
import { StatusStepper } from "@/components/status-stepper";
import { ResultHeader } from "@/components/result-header";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { InsightsPanel } from "@/components/insights-panel";
import { JsonViewer } from "@/components/json-viewer";
import { Waveform } from "@/components/ui/waveform";
import { transcribeAudio } from "@/lib/api";
import type { TranscriptionResult, UploadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Mic,
    title: "Transcription",
    desc: "Time-aligned ASR with word-level confidence scores",
  },
  {
    icon: ScanSearch,
    title: "Entity Extraction",
    desc: "Amounts, dates, and named entities pulled from speech",
  },
  {
    icon: Brain,
    title: "Intent Analysis",
    desc: "Classify what the speaker intends and any obligations",
  },
];

export default function HomePage() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setStatus("uploading");

    try {
      setStatus("transcribing");
      const data = await transcribeAudio(selectedFile, (s) =>
        setStatus(s as UploadStatus),
      );
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setStatus("idle");
  }, []);

  const isProcessing = status === "uploading" || status === "transcribing";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* ─── Header ─── */}
      <header className="shrink-0 border-b bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <AudioWaveform className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold tracking-tight text-foreground">
                GeoGood
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Audio Intel
              </Badge>
            </div>
          </div>

          <StatusStepper status={status} />

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                status === "done"
                  ? "bg-green-500"
                  : isProcessing
                    ? "bg-primary animate-pulse"
                    : "bg-muted-foreground/20",
              )}
            />
            <span className="text-xs text-muted-foreground">
              {status === "idle"
                ? "Ready"
                : status === "done"
                  ? "Complete"
                  : isProcessing
                    ? "Processing"
                    : "Error"}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ═══════════ UPLOAD STATE ═══════════ */}
          {!result && status !== "error" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex h-full flex-col items-center justify-center px-6"
            >
              <div className="w-full max-w-lg space-y-8">
                {/* Hero text */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="text-center space-y-3"
                >
                  <Waveform
                    bars={40}
                    className="h-5 mx-auto mb-4 opacity-40"
                    active={isProcessing}
                  />
                  <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
                    Audio Intelligence
                  </h1>
                  <p className="text-sm leading-relaxed text-muted-foreground max-w-sm mx-auto text-balance">
                    Upload a recording to get time-aligned transcription with
                    structured entity extraction and intent classification.
                  </p>
                </motion.div>

                {/* Upload zone */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <UploadZone
                    onFileSelect={handleFileSelect}
                    status={status}
                    currentFile={file}
                    onClear={handleClear}
                  />
                </motion.div>

                {/* Processing animation */}
                <AnimatePresence>
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <Waveform bars={20} className="h-4" active />
                      <p className="text-xs font-medium text-muted-foreground">
                        {status === "uploading"
                          ? "Uploading audio…"
                          : "Running ASR pipeline…"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Feature pills */}
                {!isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="grid grid-cols-3 gap-3"
                  >
                    {features.map((feat, i) => {
                      const Icon = feat.icon;
                      return (
                        <motion.div
                          key={feat.title}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 + i * 0.1 }}
                        >
                          <Card className="p-3 text-center space-y-2 hover:bg-muted/50 transition-colors">
                            <Icon className="h-4 w-4 text-primary mx-auto" />
                            <p className="text-xs font-medium text-foreground">
                              {feat.title}
                            </p>
                            <p className="text-[10px] leading-relaxed text-muted-foreground">
                              {feat.desc}
                            </p>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════ ERROR STATE ═══════════ */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full flex-col items-center justify-center gap-6 px-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/20">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-base font-semibold text-foreground">
                  Transcription Failed
                </p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {error}
                </p>
              </div>
              <Button variant="outline" onClick={handleClear}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </motion.div>
          )}

          {/* ═══════════ RESULTS STATE ═══════════ */}
          {result && status === "done" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex h-full flex-col overflow-hidden"
            >
              {/* Results sub-header */}
              <div className="shrink-0 border-b bg-card/30">
                <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-5" />
                  <ResultHeader
                    recordingId={result.recording_id}
                    duration={result.duration_s}
                    language={result.language}
                    segmentCount={result.segments.length}
                  />
                </div>
              </div>

              {/* Tabbed content */}
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-6xl px-6 py-6">
                  <Tabs defaultValue="transcript">
                    <TabsList>
                      <TabsTrigger value="transcript" className="gap-1.5">
                        <FileAudio className="h-3.5 w-3.5" />
                        Transcript
                      </TabsTrigger>
                      <TabsTrigger value="insights" className="gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5" />
                        Insights
                      </TabsTrigger>
                      <TabsTrigger value="json" className="gap-1.5">
                        <Braces className="h-3.5 w-3.5" />
                        Raw JSON
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="transcript" className="mt-6">
                      <TranscriptViewer segments={result.segments} />
                    </TabsContent>

                    <TabsContent value="insights" className="mt-6">
                      <InsightsPanel insights={result.insights} />
                    </TabsContent>

                    <TabsContent value="json" className="mt-6">
                      <JsonViewer data={result} title="Full Response" />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
