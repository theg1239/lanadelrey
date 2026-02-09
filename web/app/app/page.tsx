"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatMs, formatFileSize, confidenceColor } from "@/lib/utils";
import { transcribeAudio } from "@/lib/api";
import type { TranscriptionResult, UploadStatus, Segment } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ═══════════════════════════════════════════════════════
   Delrey Platform — Audio Intelligence Workstation
   ═══════════════════════════════════════════════════════
   Neobrutalist aesthetic: hard shadows, playful colors,
   warm pink/teal palette. Left sidebar nav, right
   insights panel, central drop zone / transcript area.
   ═══════════════════════════════════════════════════════ */

// ── Deterministic random for waveform ──────────────────
function seeded(n: number) {
    const x = Math.sin(n * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}

// ── Waveform visualization ─────────────────────────────
function WaveViz({ bars = 32, active = false }: { bars?: number; active?: boolean }) {
    return (
        <div className="flex items-end justify-center gap-[3px] h-12" aria-hidden>
            {Array.from({ length: bars }, (_, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-[3px] rounded-full bg-primary/70 waveform-bar",
                        !active && "!animate-none opacity-30",
                    )}
                    style={{
                        height: `${Math.round(6 + seeded(i) * 36)}px`,
                        animationDelay: `${(i * 0.04).toFixed(2)}s`,
                    }}
                />
            ))}
        </div>
    );
}

// ── Drop zone ──────────────────────────────────────────
function DropZone({
    onFile,
    processing,
    file,
    status,
}: {
    onFile: (f: File) => void;
    processing: boolean;
    file: File | null;
    status: UploadStatus;
}) {
    const [over, setOver] = useState(false);
    const ref = useRef<HTMLInputElement>(null);

    const accept = [
        "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg",
        "audio/flac", "audio/webm", "audio/mp4", "audio/x-m4a",
    ].join(",");

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                const f = e.dataTransfer.files[0];
                if (f) onFile(f);
            }}
            onClick={() => !processing && ref.current?.click()}
            className={cn(
                "relative flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                "border-2 border-dashed rounded-xl",
                over
                    ? "border-primary bg-primary/[0.06] scale-[1.01]"
                    : "border-border/60 hover:border-primary/50 hover:bg-card/30",
                processing && "pointer-events-none",
            )}
        >
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/[0.04] rounded-full blur-[80px] pointer-events-none" />

            <input
                ref={ref}
                type="file"
                accept={accept}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                className="hidden"
            />

            <AnimatePresence mode="wait">
                {file ? (
                    <motion.div
                        key="loaded"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <WaveViz bars={40} active={processing} />
                        <div className="text-center space-y-1.5">
                            <p className="text-sm font-semibold text-foreground tracking-tight">
                                {file.name}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground/60 tabular-nums">
                                {formatFileSize(file.size)}
                            </p>
                        </div>
                        {processing && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                                <span className="font-mono text-[11px] tracking-wider uppercase text-primary/80">
                                    {status === "uploading" ? "uploading" : "transcribing"}
                                </span>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative flex flex-col items-center gap-5"
                    >
                        <WaveViz bars={48} />
                        <div className="text-center space-y-3">
                            <p className="text-sm text-foreground/70 font-medium">
                                drop audio or click to upload
                            </p>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {["wav", "mp3", "ogg", "flac", "webm"].map((f) => (
                                    <span
                                        key={f}
                                        className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground/50 px-2.5 py-0.5 border border-border/50 rounded-md bg-card/30"
                                    >
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Segment row ────────────────────────────────────────
function SegRow({
    seg,
    index,
    isActive,
    onClick,
}: {
    seg: Segment;
    index: number;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors",
                "hover:bg-card/40",
                isActive && "bg-primary/[0.06] border-l-2 border-primary",
            )}
        >
            {/* index + timestamp */}
            <div className="shrink-0 w-16 pt-0.5">
                <span className="font-mono text-[10px] text-muted-foreground/30 tabular-nums">
                    {String(index + 1).padStart(3, "0")}
                </span>
                <span className="font-mono text-[10px] text-secondary tabular-nums ml-1.5">
                    {formatMs(seg.start_ms)}
                </span>
            </div>

            {/* text */}
            <span className="flex-1 text-[13px] leading-[1.65] text-foreground/80 font-serif">
                {seg.text}
            </span>

            {/* confidence bar */}
            {seg.confidence != null && (
                <div className="shrink-0 pt-1.5 flex items-center gap-1.5">
                    <div className="w-8 h-[3px] rounded-full bg-border/40 overflow-hidden">
                        <div
                            className={cn("h-full rounded-full", confidenceColor(seg.confidence))}
                            style={{ width: `${seg.confidence * 100}%`, backgroundColor: "currentColor" }}
                        />
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground/40 tabular-nums w-7 text-right">
                        {(seg.confidence * 100).toFixed(0)}
                    </span>
                </div>
            )}
        </button>
    );
}

// ── Entity pill ────────────────────────────────────────
function EntityPill({ type, value, currency }: { type: string; value: string; currency?: string | null }) {
    return (
        <div className="flex items-center justify-between py-2 px-3 border-b border-border/30 last:border-b-0">
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground/50">
                {type}
            </span>
            <span className="font-mono text-xs text-foreground/80 tabular-nums font-medium">
                {currency && `${currency} `}{value}
            </span>
        </div>
    );
}

// ── Left Sidebar Nav ───────────────────────────────────
function LeftSidebar() {
    const navItems = [
        { label: "Dashboard", active: true },
        { label: "Library", active: false },
        { label: "Settings", active: false },
    ];

    return (
        <div className="w-52 shrink-0 flex flex-col border-r border-border/40 bg-sidebar">
            {/* Brand */}
            <div className="h-14 flex items-center px-5 border-b border-border/40">
                <span className="text-base font-bold tracking-tight text-sidebar-foreground">
                    Delrey
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-0.5">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                            item.active
                                ? "bg-sidebar-accent/30 text-sidebar-foreground"
                                : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/10",
                        )}
                    >
                        {/* Small dot indicator */}
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            item.active ? "bg-primary" : "bg-sidebar-foreground/20",
                        )} />
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Bottom */}
            <div className="p-3 border-t border-border/30">
                <a
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
                >
                    ← Back to home
                </a>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// ──  MAIN PAGE                                       ──
// ═══════════════════════════════════════════════════════
export default function AppPage() {
    const [status, setStatus] = useState<UploadStatus>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<TranscriptionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeSegment, setActiveSegment] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"transcript" | "entities" | "json">("transcript");
    const [copied, setCopied] = useState(false);

    const handleFile = useCallback(async (f: File) => {
        setFile(f);
        setError(null);
        setResult(null);
        setStatus("uploading");
        try {
            setStatus("transcribing");
            const data = await transcribeAudio(f, (s) => setStatus(s as UploadStatus));
            setResult(data);
            setStatus("done");
            setActiveTab("transcript");
        } catch (err) {
            setError(err instanceof Error ? err.message : "transcription failed");
            setStatus("error");
        }
    }, []);

    const handleClear = useCallback(() => {
        setFile(null);
        setResult(null);
        setError(null);
        setStatus("idle");
        setActiveSegment(null);
    }, []);

    const handleCopy = useCallback(async () => {
        if (!result) return;
        await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [result]);

    const isProcessing = status === "uploading" || status === "transcribing";
    const hasResult = result && status === "done";

    return (
        <div className="h-dvh w-dvw flex overflow-hidden bg-background select-none">
            {/* ═══ LEFT SIDEBAR ═══ */}
            <LeftSidebar />

            {/* ═══ MAIN CONTENT ═══ */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* ═══ TOP BAR ═══ */}
                <div className="shrink-0 h-14 flex items-center justify-between px-5 border-b border-border/40 bg-card/30">
                    {/* left: page title */}
                    <div className="flex items-center gap-3">
                        <h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                                <span className="font-mono text-[10px] text-secondary tracking-wider uppercase">
                                    {status === "uploading" ? "upload" : "transcribing"}
                                </span>
                            </motion.div>
                        )}
                    </div>

                    {/* center: meta */}
                    {hasResult && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-4"
                        >
                            <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                                {result.recording_id.slice(0, 8)}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                                {result.segments.length} seg
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                                {result.language?.toUpperCase()}
                            </span>
                        </motion.div>
                    )}

                    {/* right: actions */}
                    <div className="flex items-center gap-3">
                        {hasResult && (
                            <button
                                onClick={handleClear}
                                className="font-mono text-[11px] text-muted-foreground/50 hover:text-foreground/70 transition-colors px-3 py-1.5 rounded-md border border-border/40 hover:border-border bg-card/20"
                            >
                                clear
                            </button>
                        )}
                        {status === "error" && (
                            <span className="font-mono text-[11px] text-destructive">error</span>
                        )}
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            status === "done" ? "bg-secondary" : status === "error" ? "bg-destructive" : "bg-muted-foreground/20",
                        )} />
                    </div>
                </div>

                {/* ═══ MAIN AREA — persistent right sidebar ═══ */}
                <div className="flex-1 flex overflow-hidden">
                    {/* ─── CENTER PANEL: upload / transcript / json ─── */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        {/* tab bar — only visible with results */}
                        {hasResult && (
                            <div className="shrink-0 h-10 flex items-center gap-0 border-b border-border/30 px-1 bg-card/10">
                                {(["transcript", "json"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "h-full px-4 font-mono text-[11px] tracking-wider uppercase transition-colors relative font-medium",
                                            activeTab === tab
                                                ? "text-foreground"
                                                : "text-muted-foreground/40 hover:text-muted-foreground/70",
                                        )}
                                    >
                                        {tab}
                                        {activeTab === tab && (
                                            <motion.div
                                                layoutId="left-tab"
                                                className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full"
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* content area */}
                        <div className="flex-1 overflow-hidden">
                            <AnimatePresence mode="wait">
                                {/* Upload / idle */}
                                {!hasResult && status !== "error" && (
                                    <motion.div
                                        key="upload-state"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.3 }}
                                        className="h-full flex flex-col p-5"
                                    >
                                        <DropZone
                                            onFile={handleFile}
                                            processing={isProcessing}
                                            file={file}
                                            status={status}
                                        />
                                    </motion.div>
                                )}

                                {/* Error */}
                                {status === "error" && (
                                    <motion.div
                                        key="error-state"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full flex flex-col items-center justify-center gap-4"
                                    >
                                        <p className="font-mono text-sm text-destructive/70">{error}</p>
                                        <button
                                            onClick={handleClear}
                                            className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground/50 hover:text-foreground/70 border-2 border-border px-4 py-2 rounded-lg transition-colors neo-card"
                                        >
                                            retry
                                        </button>
                                    </motion.div>
                                )}

                                {/* Transcript */}
                                {hasResult && activeTab === "transcript" && (
                                    <motion.div
                                        key="transcript"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full"
                                    >
                                        <ScrollArea className="h-full">
                                            {result.segments.map((seg, i) => (
                                                <SegRow
                                                    key={i}
                                                    seg={seg}
                                                    index={i}
                                                    isActive={activeSegment === i}
                                                    onClick={() => setActiveSegment(activeSegment === i ? null : i)}
                                                />
                                            ))}
                                        </ScrollArea>
                                    </motion.div>
                                )}

                                {/* JSON */}
                                {hasResult && activeTab === "json" && (
                                    <motion.div
                                        key="json"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="relative h-full"
                                    >
                                        <ScrollArea className="h-full">
                                            <pre className="p-5 font-mono text-[11px] leading-[1.7] text-foreground/50 whitespace-pre">
                                                {JSON.stringify(result, null, 2)}
                                            </pre>
                                        </ScrollArea>
                                        <button
                                            onClick={handleCopy}
                                            className="absolute top-3 right-3 font-mono text-[10px] tracking-wider uppercase text-muted-foreground/40 hover:text-foreground/60 border border-border px-3 py-1.5 rounded-md transition-colors bg-card/80 backdrop-blur-sm"
                                        >
                                            {copied ? "copied ✓" : "copy"}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* ─── RIGHT SIDEBAR — always visible ─── */}
                    <div className="w-64 shrink-0 flex flex-col border-l border-border/30 overflow-hidden bg-card/20">
                        {/* sidebar header */}
                        <div className="shrink-0 h-10 flex items-center px-4 border-b border-border/30">
                            <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground/50 font-medium">
                                {hasResult ? "insights" : "pipeline"}
                            </span>
                        </div>

                        {/* sidebar content */}
                        <ScrollArea className="flex-1">
                            <AnimatePresence mode="wait">
                                {/* ── IDLE sidebar ── */}
                                {!hasResult && (
                                    <motion.div
                                        key="sidebar-idle"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="p-4 space-y-6"
                                    >
                                        {/* pipeline stages */}
                                        <div className="space-y-3">
                                            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                stages
                                            </span>
                                            {[
                                                { step: "01", name: "ingest", desc: "normalize audio" },
                                                { step: "02", name: "transcribe", desc: "fintech asr" },
                                                { step: "03", name: "analyze", desc: "extract intel" },
                                            ].map((stage) => (
                                                <div key={stage.step} className="flex gap-3 items-start">
                                                    <span className="font-mono text-[11px] text-primary tabular-nums pt-px font-semibold">
                                                        {stage.step}
                                                    </span>
                                                    <div>
                                                        <p className="font-mono text-[12px] text-foreground/70 font-medium">
                                                            {stage.name}
                                                        </p>
                                                        <p className="font-mono text-[9px] text-muted-foreground/40 mt-0.5">
                                                            {stage.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* capabilities */}
                                        <div className="space-y-2">
                                            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                capabilities
                                            </span>
                                            {[
                                                "entity extraction",
                                                "intent classification",
                                                "obligation detection",
                                                "confidence scoring",
                                                "speaker diarization",
                                            ].map((cap) => (
                                                <div key={cap} className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-secondary/60 shrink-0" />
                                                    <span className="font-mono text-[10px] text-muted-foreground/50">
                                                        {cap}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* formats */}
                                        <div className="space-y-2">
                                            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                accepted
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                                {["wav", "mp3", "ogg", "flac", "webm", "mp4"].map((fmt) => (
                                                    <span
                                                        key={fmt}
                                                        className="font-mono text-[8px] tracking-wider uppercase text-muted-foreground/40 border border-border/40 rounded-md px-2 py-0.5 bg-card/30"
                                                    >
                                                        {fmt}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* stats */}
                                        <div className="space-y-2">
                                            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                specs
                                            </span>
                                            {[
                                                { k: "latency", v: "<2s" },
                                                { k: "accuracy", v: "99.1%" },
                                                { k: "languages", v: "12" },
                                            ].map((stat) => (
                                                <div key={stat.k} className="flex items-center justify-between">
                                                    <span className="font-mono text-[10px] text-muted-foreground/40">
                                                        {stat.k}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-primary font-semibold tabular-nums">
                                                        {stat.v}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── RESULTS sidebar ── */}
                                {hasResult && (
                                    <motion.div
                                        key="sidebar-results"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="p-4 space-y-5"
                                    >
                                        {/* recording meta */}
                                        <div className="space-y-1.5">
                                            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                recording
                                            </span>
                                            <div className="space-y-1">
                                                <p className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                                                    {result.recording_id.slice(0, 12)}
                                                </p>
                                                <p className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                                                    {result.duration_s?.toFixed(1)}s · {result.segments.length} seg · {result.language?.toUpperCase()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* intent */}
                                        {result.insights?.intent && (
                                            <div className="space-y-1.5">
                                                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                    intent
                                                </span>
                                                <span className="font-mono text-xs text-primary font-semibold">
                                                    {result.insights.intent.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        )}

                                        {/* entities */}
                                        {result.insights?.entities?.length > 0 && (
                                            <div className="space-y-1.5">
                                                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                    entities
                                                </span>
                                                <div className="border border-border/40 rounded-lg overflow-hidden">
                                                    {result.insights.entities.map((e, i) => (
                                                        <EntityPill
                                                            key={i}
                                                            type={e.type}
                                                            value={String(e.value)}
                                                            currency={e.currency}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* obligations */}
                                        {result.insights?.obligations?.length > 0 && (
                                            <div className="space-y-1.5">
                                                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                    obligations
                                                </span>
                                                <div className="space-y-2">
                                                    {result.insights.obligations.map((ob, i) => (
                                                        <p
                                                            key={i}
                                                            className="text-[11px] leading-[1.6] text-foreground/60 font-serif italic pl-2 border-l-2 border-primary/30"
                                                        >
                                                            {ob.text}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* segment detail */}
                                        {activeSegment !== null && result.segments[activeSegment] && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-1.5 pt-3 border-t border-border/30"
                                            >
                                                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40 block font-medium">
                                                    segment {activeSegment + 1}
                                                </span>
                                                <div className="space-y-1">
                                                    <p className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                                                        {formatMs(result.segments[activeSegment].start_ms)} → {formatMs(result.segments[activeSegment].end_ms)}
                                                    </p>
                                                    <p className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                                                        {result.segments[activeSegment].end_ms - result.segments[activeSegment].start_ms}ms duration
                                                    </p>
                                                    {result.segments[activeSegment].confidence != null && (
                                                        <p className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                                                            confidence {(result.segments[activeSegment].confidence * 100).toFixed(1)}%
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </div>
    );
}
