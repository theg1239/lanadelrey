"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, AlertCircle, AudioWaveform } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UploadZone } from "@/components/upload-zone";
import { StatusStepper } from "@/components/status-stepper";
import { ResultHeader } from "@/components/result-header";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { InsightsPanel } from "@/components/insights-panel";
import { JsonViewer } from "@/components/json-viewer";
import { Waveform } from "@/components/ui/waveform";
import { transcribeAudio } from "@/lib/api";
import type { TranscriptionResult, UploadStatus } from "@/lib/types";

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
    <div className="relative flex flex-col">
      {/* ─── Ambient Background ─── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="ambient-glow absolute -top-[40%] right-[10%] h-[600px] w-[600px] rounded-full bg-primary/[0.03] blur-[150px]" />
        <div
          className="ambient-glow absolute -bottom-[30%] -left-[10%] h-[500px] w-[500px] rounded-full bg-accent/[0.05] blur-[120px]"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="ambient-glow absolute top-[40%] left-[60%] h-[300px] w-[300px] rounded-full bg-chart-2/[0.02] blur-[100px]"
          style={{ animationDelay: "-13s" }}
        />
      </div>

      {/* ─── Navigation ─── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <AudioWaveform className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-semibold tracking-tight text-foreground">
                GeoGood
              </span>
              <Badge variant="secondary" className="font-mono text-[10px] tracking-wider uppercase">
                Audio Intel
              </Badge>
            </div>
          </div>

          <StatusStepper status={status} />

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground/50 tracking-wider">
              v0.1
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <AnimatePresence mode="wait">
          {/* ═══ UPLOAD VIEW ═══ */}
          {!result && status !== "error" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center pt-20 pb-24"
            >
              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="mb-16 max-w-2xl text-center"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mb-8 flex justify-center"
                >
                  <Waveform
                    bars={40}
                    className="h-10"
                    active={isProcessing}
                  />
                </motion.div>

                <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance leading-[1.1]">
                  Audio Intelligence
                </h1>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground text-balance max-w-lg mx-auto">
                  Upload an audio file. Get a time-aligned transcript with
                  structured insights — intents, entities, and obligations
                  extracted automatically.
                </p>
              </motion.div>

              {/* Upload area */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-xl"
              >
                <UploadZone
                  onFileSelect={handleFileSelect}
                  status={status}
                  currentFile={file}
                  onClear={handleClear}
                />
              </motion.div>

              {/* Processing indicator */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-10 flex flex-col items-center gap-4"
                  >
                    <Waveform bars={56} className="h-5" active />
                    <p className="font-mono text-xs text-muted-foreground tracking-wide">
                      {status === "uploading"
                        ? "SENDING AUDIO TO SERVER"
                        : "RUNNING ASR PIPELINE"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Feature pillars */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/30 sm:grid-cols-3"
              >
                {[
                  {
                    label: "Transcription",
                    mono: "ASR",
                    desc: "Time-aligned segments with per-word confidence scores",
                  },
                  {
                    label: "Entity Extraction",
                    mono: "NER",
                    desc: "Amounts, dates, names, and currencies from speech",
                  },
                  {
                    label: "Intent Analysis",
                    mono: "NLU",
                    desc: "Obligations, promises, and speaker intent classification",
                  },
                ].map((feat, i) => (
                  <motion.div
                    key={feat.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                    className="bg-card/60 p-6 backdrop-blur-sm"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="font-mono text-[10px] font-medium tracking-widest text-primary uppercase">
                        {feat.mono}
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {feat.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {feat.desc}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ═══ ERROR VIEW ═══ */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 py-32"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <div className="text-center max-w-md">
                <p className="font-serif text-lg font-semibold text-foreground">
                  Transcription Failed
                </p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {error}
                </p>
              </div>
              <Button variant="secondary" onClick={handleClear}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </motion.div>
          )}

          {/* ═══ RESULTS VIEW ═══ */}
          {result && status === "done" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="py-8 space-y-8"
            >
              {/* Back button */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground -ml-2"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  New upload
                </Button>
              </motion.div>

              {/* Recording stats */}
              <ResultHeader
                recordingId={result.recording_id}
                duration={result.duration_s}
                language={result.language}
                segmentCount={result.segments.length}
              />

              {/* Tab navigation with shadcn Tabs */}
              <Tabs defaultValue="transcript" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="transcript" className="font-mono text-xs tracking-wide">
                    Transcript
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="font-mono text-xs tracking-wide">
                    Insights
                  </TabsTrigger>
                  <TabsTrigger value="json" className="font-mono text-xs tracking-wide">
                    Raw JSON
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="transcript">
                  <TranscriptViewer segments={result.segments} />
                </TabsContent>

                <TabsContent value="insights">
                  <InsightsPanel insights={result.insights} />
                </TabsContent>

                <TabsContent value="json">
                  <JsonViewer data={result} />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/30 mt-auto">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground/40 uppercase">
            GeoGood Audio Intelligence
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/30">
            Challenge 1
          </span>
        </div>
      </footer>
    </div>
  );
}
