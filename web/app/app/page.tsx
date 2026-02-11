"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, Languages } from "lucide-react";
import { cn, formatMs, formatFileSize, confidenceColor } from "@/lib/utils";
import { fetchPublicAudioFile, listLibraryAudio, transcribeAudio } from "@/lib/api";
import type {
    LibraryAudioItem,
    Segment,
    TranscriptionResult,
    UploadStatus,
} from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InsightsFallback, InsightsRenderer } from "@/components/insights-renderer";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
    MinimalVoiceAgent,
    type ActiveRecording as VoiceAgentActiveRecording,
    type RecordingAnalysis as VoiceAgentRecordingAnalysis,
} from "@/components/voice-agent/minimal-voice-agent";

type AppSection = "dashboard" | "library" | "voice" | "settings";
type LibraryStatus = "idle" | "loading" | "ready" | "error";

const parseAppSection = (value: string | null): AppSection | null => {
    if (value === "dashboard" || value === "library" || value === "voice" || value === "settings") {
        return value;
    }
    return null;
};

const PIPELINE_STAGES = [
    { key: "uploading", label: "Ingesting", desc: "Uploading audio & detecting codec" },
    { key: "transcribing", label: "Transcribing", desc: "ASR with speaker diarization" },
    { key: "analyzing", label: "Analyzing", desc: "Intent, entity & obligation extraction" },
    { key: "finalizing", label: "Finalizing", desc: "Building structured insights" },
] as const;
const buildVoiceAgentAnalysis = (result: TranscriptionResult): VoiceAgentRecordingAnalysis => {
    const primaryIntent = result.insights.primary_intent?.trim();
    const secondaryIntents = (result.insights.secondary_intents ?? []).filter(Boolean);
    const keyPoints: string[] = [];
    if (primaryIntent) keyPoints.push(`Intent: ${primaryIntent}`);
    for (const topic of secondaryIntents.slice(0, 4)) {
        keyPoints.push(`Topic: ${topic}`);
    }
    for (const item of (result.insights.action_items ?? []).slice(0, 4)) {
        keyPoints.push(`Action: ${item}`);
    }
    for (const ob of (result.insights.obligations ?? []).slice(0, 3)) {
        if (ob?.text) keyPoints.push(`Obligation: ${ob.text}`);
    }
    return {
        summary: result.insights.summary ?? "",
        keyPoints: keyPoints.slice(0, 10),
        actionItems: (result.insights.action_items ?? []).slice(0, 12),
        topics: Array.from(new Set([primaryIntent, ...secondaryIntents].filter(Boolean))).slice(0, 10),
        sentiment: result.insights.sentiment ?? "neutral",
    };
};

function useElapsedTime(running: boolean) {
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef<number | null>(null);
    useEffect(() => {
        if (running) {
            startRef.current = Date.now();
            setElapsed(0);
            const id = setInterval(() => {
                setElapsed(Date.now() - (startRef.current ?? Date.now()));
            }, 100);
            return () => clearInterval(id);
        } else {
            startRef.current = null;
        }
    }, [running]);
    return elapsed;
}

function PipelineStepper({ status }: { status: UploadStatus }) {
    const elapsed = useElapsedTime(status !== "idle" && status !== "done" && status !== "error");
    const currentIdx = PIPELINE_STAGES.findIndex(s => s.key === status);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                    Pipeline
                </p>
                <span className="font-mono text-[10px] text-primary tabular-nums">
                    {(elapsed / 1000).toFixed(1)}s
                </span>
            </div>

            <div className="space-y-1">
                {PIPELINE_STAGES.map((stage, i) => {
                    const isDone = currentIdx > i;
                    const isActive = currentIdx === i;
                    const isPending = currentIdx < i;

                    return (
                        <motion.div
                            key={stage.key}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08, duration: 0.3 }}
                            className={cn(
                                "flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                isActive && "bg-primary/[0.08] border border-primary/20",
                                isDone && "opacity-60",
                                isPending && "opacity-30",
                            )}
                        >
                            <div className="shrink-0 mt-0.5 relative">
                                {isDone ? (
                                    <div className="w-5 h-5 bg-primary/20 border border-primary/40 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                ) : isActive ? (
                                    <div className="w-5 h-5 border-2 border-primary rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                    </div>
                                ) : (
                                    <div className="w-5 h-5 border border-border/60 rounded-full flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-border/40 rounded-full" />
                                    </div>
                                )}
                                {i < PIPELINE_STAGES.length - 1 && (
                                    <div className={cn(
                                        "absolute top-6 left-1/2 -translate-x-1/2 w-px h-4",
                                        isDone ? "bg-primary/30" : "bg-border/30"
                                    )} />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    {isActive ? (
                                        <Shimmer as="p" className="text-[12px] font-semibold" duration={1.8}>
                                            {stage.label}
                                        </Shimmer>
                                    ) : (
                                        <p className={cn(
                                            "text-[12px] font-semibold",
                                            isDone ? "text-foreground/60" : "text-muted-foreground/40"
                                        )}>
                                            {stage.label}
                                        </p>
                                    )}
                                </div>
                                <p className={cn(
                                    "text-[10px] leading-relaxed mt-0.5",
                                    isActive ? "text-muted-foreground/70" : "text-muted-foreground/30"
                                )}>
                                    {stage.desc}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-1">
                <div className="h-1 w-full bg-border/30 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: "0%" }}
                        animate={{
                            width: currentIdx === 0 ? "15%" : currentIdx === 1 ? "45%" : currentIdx === 2 ? "75%" : currentIdx === 3 ? "90%" : "0%"
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-muted-foreground/40">
                        {currentIdx >= 0 ? `${currentIdx + 1}/${PIPELINE_STAGES.length}` : ""}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground/40">
                        processing
                    </span>
                </div>
            </div>
        </div>
    );
}
function seeded(n: number) {
    const x = Math.sin(n * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}
function WaveViz({ bars = 32, active = false }: {
    bars?: number;
    active?: boolean;
}) {
    return (<div className="flex items-end justify-center gap-[3px] h-12" aria-hidden>
        {Array.from({ length: bars }, (_, i) => (<div key={i} className={cn("w-[3px] rounded-full bg-primary/70 waveform-bar", !active && "!animate-none opacity-30")} style={{
            height: `${Math.round(6 + seeded(i) * 36)}px`,
            animationDelay: `${(i * 0.04).toFixed(2)}s`,
        }} />))}
    </div>);
}
function DropZone({ onFile, processing, file, status, }: {
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
    return (<div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f)
            onFile(f);
    }} onClick={() => !processing && ref.current?.click()} className={cn("relative flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-300", "border-2 border-dashed rounded-xl", over
        ? "border-primary bg-primary/[0.06] scale-[1.01]"
        : "border-border/60 hover:border-primary/50 hover:bg-card/30", processing && "pointer-events-none")}>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/[0.04] rounded-full blur-[80px] pointer-events-none" />

        <input ref={ref} type="file" accept={accept} onChange={(e) => {
            const f = e.target.files?.[0]; if (f)
                onFile(f);
        }} className="hidden" />

        <AnimatePresence mode="wait">
            {file ? (<motion.div key="loaded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                <WaveViz bars={40} active={processing} />
                <div className="text-center space-y-1.5">
                    <p className="text-sm font-semibold text-foreground tracking-tight">
                        {file.name}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground/60 tabular-nums">
                        {formatFileSize(file.size)}
                    </p>
                </div>
                {processing && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary animate-pulse rounded-full" />
                        <Shimmer as="span" className="font-mono text-[11px] tracking-[0.2em] uppercase" duration={1.5}>
                            {status === "uploading" ? "ingesting audio" : status === "transcribing" ? "running ASR" : status === "analyzing" ? "extracting insights" : "building output"}
                        </Shimmer>
                    </div>
                    <div className="w-48 space-y-1.5">
                        <div className="h-[2px] w-full bg-primary/20 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary/60 rounded-full w-[40%]"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </div>
                    </div>
                </motion.div>)}
            </motion.div>) : (<motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex flex-col items-center gap-5">
                <WaveViz bars={48} />
                <div className="text-center space-y-3">
                    <p className="text-sm text-foreground/70 font-medium">
                        drop audio or click to upload
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                        {["wav", "mp3", "ogg", "flac", "webm"].map((f) => (<span key={f} className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground/50 px-2.5 py-0.5 border border-border/50 rounded-md bg-card/30">
                            {f}
                        </span>))}
                    </div>
                </div>
            </motion.div>)}
        </AnimatePresence>
    </div>);
}
type ScriptStyle = {
    label: string;
    fontFamily: string;
    toneClass: string;
    direction?: "ltr" | "rtl";
};
const SCRIPT_STYLES: Array<{ pattern: RegExp; style: ScriptStyle; }> = [
    {
        pattern: /[\u0B80-\u0BFF]/,
        style: {
            label: "Tamil",
            fontFamily: "var(--font-native-tamil), var(--font-sans), sans-serif",
            toneClass: "border-chart-3/25 bg-chart-3/[0.08] text-chart-3",
        },
    },
    {
        pattern: /[\u0C80-\u0CFF]/,
        style: {
            label: "Kannada",
            fontFamily: "var(--font-native-kannada), var(--font-sans), sans-serif",
            toneClass: "border-primary/25 bg-primary/[0.08] text-primary",
        },
    },
    {
        pattern: /[\u0900-\u097F]/,
        style: {
            label: "Devanagari",
            fontFamily: "var(--font-native-devanagari), var(--font-sans), sans-serif",
            toneClass: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-600",
        },
    },
    {
        pattern: /[\u0600-\u06FF]/,
        style: {
            label: "Arabic",
            fontFamily: "var(--font-sans), sans-serif",
            toneClass: "border-sky-500/25 bg-sky-500/[0.08] text-sky-600",
            direction: "rtl",
        },
    },
    {
        pattern: /[\u0C00-\u0C7F]/,
        style: {
            label: "Telugu",
            fontFamily: "var(--font-sans), sans-serif",
            toneClass: "border-fuchsia-500/25 bg-fuchsia-500/[0.08] text-fuchsia-600",
        },
    },
    {
        pattern: /[\u0D00-\u0D7F]/,
        style: {
            label: "Malayalam",
            fontFamily: "var(--font-sans), sans-serif",
            toneClass: "border-indigo-500/25 bg-indigo-500/[0.08] text-indigo-600",
        },
    },
    {
        pattern: /[\u0980-\u09FF]/,
        style: {
            label: "Bengali",
            fontFamily: "var(--font-sans), sans-serif",
            toneClass: "border-amber-500/25 bg-amber-500/[0.08] text-amber-700",
        },
    },
];
const detectScriptStyle = (text: string): ScriptStyle => {
    for (const entry of SCRIPT_STYLES) {
        if (entry.pattern.test(text)) {
            return entry.style;
        }
    }
    return {
        label: "Native",
        fontFamily: "var(--font-sans), sans-serif",
        toneClass: "border-border/40 bg-muted/20 text-muted-foreground/80",
    };
};
function SegRow({ seg, index, isActive, isPlaying, segmentProgress, hasAudio, onClick, onPlaySegment, }: {
    seg: Segment;
    index: number;
    isActive: boolean;
    isPlaying: boolean;
    segmentProgress: number;
    hasAudio: boolean;
    onClick: () => void;
    onPlaySegment: () => void;
}) {
    const primaryText = seg.translated_text ?? seg.text;
    const originalText = seg.original_text && seg.original_text !== primaryText
        ? seg.original_text
        : null;
    const scriptStyle = detectScriptStyle(originalText ?? primaryText);
    const nativeText = originalText ?? primaryText;
    return (<div role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
            }
        }} className={cn("group w-full px-3 py-3 text-left transition-colors border-b border-border/20", "hover:bg-card/35", isActive && "bg-primary/[0.05]")}>
        <div className="flex items-start gap-3">
            <div className="shrink-0 w-[4.5rem] pt-0.5 space-y-0.5">
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground/35 tabular-nums">
                        {String(index + 1).padStart(3, "0")}
                    </span>
                    <span className="font-mono text-[10px] text-secondary tabular-nums">
                        {formatMs(seg.start_ms)}
                    </span>
                </div>
                <button type="button" onClick={(event) => {
                        event.stopPropagation();
                        onPlaySegment();
                    }} disabled={!hasAudio} className={cn("w-full inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] tracking-wide uppercase transition-colors", hasAudio
                        ? "border-primary/30 bg-primary/[0.08] text-primary hover:bg-primary/[0.14]"
                        : "border-border/40 bg-muted/20 text-muted-foreground/35 cursor-not-allowed")}>
                    {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {isPlaying ? "playing" : "play"}
                </button>
            </div>

            <div className="flex-1 min-w-0 space-y-2.5">
                <div className="rounded-lg border border-border/35 bg-card/35 px-3 py-2.5">
                    <p className="font-mono text-[9px] tracking-[0.16em] uppercase text-muted-foreground/45 mb-1.5">
                        English
                    </p>
                    <p className="text-[13px] leading-[1.65] text-foreground/80">
                        {primaryText}
                    </p>
                </div>

                <div className={cn("rounded-lg border px-3 py-2.5", scriptStyle.toneClass)}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="font-mono text-[9px] tracking-[0.16em] uppercase opacity-80 inline-flex items-center gap-1">
                            <Languages className="h-3 w-3" />
                            Native Script
                        </p>
                        <span className="font-mono text-[9px] tracking-wide uppercase opacity-75">
                            {scriptStyle.label}
                        </span>
                    </div>
                    <p dir={scriptStyle.direction ?? "ltr"} style={{ fontFamily: scriptStyle.fontFamily }} className="text-[17px] leading-[1.9] tracking-[0.01em] text-foreground/90 break-words">
                        {nativeText}
                    </p>
                </div>
            </div>

            {seg.confidence != null && (<div className="shrink-0 pt-1.5 flex items-center gap-1.5">
                <div className="w-10 h-[4px] rounded-full bg-border/40 overflow-hidden">
                    <div className={cn("h-full rounded-full", confidenceColor(seg.confidence))} style={{ width: `${seg.confidence * 100}%`, backgroundColor: "currentColor" }} />
                </div>
                <span className="font-mono text-[9px] text-muted-foreground/40 tabular-nums w-7 text-right">
                    {(seg.confidence * 100).toFixed(0)}
                </span>
            </div>)}
        </div>
        {isPlaying && (<div className="mt-2 ml-[5.25rem]">
            <div className="h-1.5 w-full rounded-full bg-primary/12 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${Math.max(0, Math.min(100, segmentProgress * 100)).toFixed(1)}%` }} />
            </div>
        </div>)}
    </div>);
}
function EntityPill({ type, value, currency }: {
    type: string;
    value: string;
    currency?: string | null;
}) {
    return (<div className="flex items-center justify-between py-2 px-3 border-b border-border/30 last:border-b-0">
        <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground/50">
            {type}
        </span>
        <span className="font-mono text-xs text-foreground/80 tabular-nums font-medium">
            {currency && `${currency} `}{value}
        </span>
    </div>);
}
function LibraryPanel({ items, status, error, onAnalyze, activeItemUrl, }: {
    items: LibraryAudioItem[];
    status: LibraryStatus;
    error: string | null;
    onAnalyze: (item: LibraryAudioItem) => void;
    activeItemUrl: string | null;
}) {
    if (status === "loading") {
        return (<div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="space-y-3 w-full max-w-sm px-8">
                <div className="h-3 w-3/4 bg-border/40 animate-pulse" />
                <div className="h-3 w-full bg-border/30 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="h-3 w-1/2 bg-border/20 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
            <Shimmer as="p" className="font-mono text-[11px] tracking-[0.2em] uppercase">
                Loading library
            </Shimmer>
        </div>);
    }
    if (status === "error") {
        return (<div className="h-full flex items-center justify-center px-6">
            <p className="text-sm text-destructive/70 text-center">
                {error ?? "Could not load files from public directory."}
            </p>
        </div>);
    }
    if (items.length === 0) {
        return (<div className="h-full flex items-center justify-center px-6">
            <p className="text-sm text-muted-foreground/70 text-center">
                No audio files found in `web/public`.
            </p>
        </div>);
    }

    return (<ScrollArea className="h-full">
        <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/50">
                    Public Audio Library
                </p>
                <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                    {items.length} files
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((item) => {
                    const isAnalyzing = activeItemUrl === item.url;
                    const modified = new Date(item.modifiedAt);
                    const ext = item.name.split(".").pop()?.toUpperCase() ?? "AUDIO";
                    return (<div key={item.url} className="border border-border/40 bg-card/20 p-3 flex flex-col gap-3 min-h-[140px]">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground/85 break-all leading-snug">
                                {item.name}
                            </p>
                            <span className="font-mono text-[9px] tracking-wide uppercase text-muted-foreground/50 px-1.5 py-0.5 border border-border/50 bg-background/40 shrink-0">
                                {ext}
                            </span>
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground/50 tabular-nums leading-relaxed">
                            {formatFileSize(item.size)}
                            {" · "}
                            {Number.isNaN(modified.getTime()) ? "unknown date" : modified.toLocaleDateString()}
                        </p>
                        <button onClick={() => onAnalyze(item)} disabled={isAnalyzing} className={cn("mt-auto w-full text-center font-mono text-[10px] tracking-wider uppercase border px-2 py-1.5 transition-colors", isAnalyzing
                            ? "border-primary/30 bg-primary/10 text-primary/80 cursor-wait"
                            : "border-border/50 bg-background/50 text-muted-foreground/70 hover:text-foreground/80 hover:border-primary/30 hover:bg-primary/5")}>
                            {isAnalyzing ? (<Shimmer as="span" className="font-mono text-[10px]" duration={1.5}>Analyzing...</Shimmer>) : "Analyze"}
                        </button>
                    </div>);
                })}
            </div>
        </div>
    </ScrollArea>);
}
function LeftSidebar({ activeSection, onSelect }: {
    activeSection: AppSection;
    onSelect: (section: AppSection) => void;
}) {
    const navItems = [
        { label: "Dashboard", key: "dashboard" as const },
        { label: "Library", key: "library" as const },
        { label: "Voice", key: "voice" as const },
        { label: "Settings", key: "settings" as const },
    ];
    return (<div className="w-52 shrink-0 flex flex-col border-r border-border/40 bg-sidebar">

        <div className="h-14 flex items-center px-5 border-b border-border/40">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">
                Delrey
            </span>
        </div>


        <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => (<button key={item.label} onClick={() => onSelect(item.key)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left", activeSection === item.key
                ? "bg-sidebar-accent/30 text-sidebar-foreground"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/10")}>

                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", activeSection === item.key ? "bg-primary" : "bg-sidebar-foreground/20")} />
                {item.label}
            </button>))}
        </nav>


        <div className="p-3 border-t border-border/30">
            <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors">
                ← Back to home
            </a>
        </div>
    </div>);
}

function VoicePanel({ items, status, error }: {
    items: LibraryAudioItem[];
    status: LibraryStatus;
    error: string | null;
}) {
    return (<div className="h-full overflow-hidden">
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">

                <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground/85">
                        Voice Agent
                    </p>
                    <p className="text-[12px] leading-relaxed text-muted-foreground/70 max-w-xl">
                        Tap the orb to record. Say <span className="font-mono text-foreground/80">recording 3</span>{" "}
                        to analyze the 3rd file in the library (for example{" "}
                        <span className="font-mono text-foreground/80">Sample3</span>).
                        Then ask questions like{" "}
                        <span className="font-mono text-foreground/80">what did they agree to?</span>{" "}
                        or{" "}
                        <span className="font-mono text-foreground/80">summarize this call</span>.
                    </p>
                    <p className="text-[11px] text-muted-foreground/50">
                        After analysis, the agent shows the active recording on the orb. Click it to view the transcript and key points.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {[
                        "recording 3",
                        "analyze Sample10",
                        "what is this call about?",
                        "what did they agree to?",
                    ].map((ex) => (<div key={ex} className="border border-border/40 bg-card/20 px-3 py-2 rounded-lg">
                        <p className="font-mono text-[11px] text-foreground/80">
                            {ex}
                        </p>
                    </div>))}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/50">
                            Recording Library Index
                        </p>
                        <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                            {status === "ready" ? `${items.length} files` : status === "loading" ? "loading…" : ""}
                        </span>
                    </div>

                    {status === "error" && (
                        <p className="text-[11px] text-destructive/80">
                            {error ?? "Failed to load library"}
                        </p>
                    )}

                    {status === "loading" && (
                        <div className="border border-border/40 bg-card/20 rounded-lg p-4">
                            <Shimmer as="p" className="font-mono text-[11px] tracking-wider uppercase" duration={1.6}>
                                loading library…
                            </Shimmer>
                        </div>
                    )}

                    {status === "ready" && items.length > 0 && (
                        <div className="border border-border/40 bg-card/10 rounded-lg overflow-hidden">
                            <div className="divide-y divide-border/30">
                                {items.map((it, i) => (<div key={it.url} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums w-10 shrink-0">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <span className="text-[12px] text-foreground/80 break-all">
                                        {it.name}
                                    </span>
                                </div>))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
    </div>);
}
export default function AppPage() {
    const initializedFromUrlRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const segmentEndMsRef = useRef<number | null>(null);
    const [activeSection, setActiveSection] = useState<AppSection>("dashboard");
    const [status, setStatus] = useState<UploadStatus>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [playingSegment, setPlayingSegment] = useState<number | null>(null);
    const [audioCurrentMs, setAudioCurrentMs] = useState(0);
    const [result, setResult] = useState<TranscriptionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeSegment, setActiveSegment] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"transcript" | "insights" | "json">("transcript");
    const [copied, setCopied] = useState(false);
    const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>("idle");
    const [libraryItems, setLibraryItems] = useState<LibraryAudioItem[]>([]);
    const [libraryError, setLibraryError] = useState<string | null>(null);
    const [activeLibraryItemUrl, setActiveLibraryItemUrl] = useState<string | null>(null);

    useEffect(() => {
        if (initializedFromUrlRef.current) return;
        const requested = parseAppSection(new URLSearchParams(window.location.search).get("section"));
        if (requested) {
            setActiveSection(requested);
        }
        initializedFromUrlRef.current = true;
    }, []);
    useEffect(() => {
        if (!file) {
            setAudioUrl(null);
            return;
        }
        const nextUrl = URL.createObjectURL(file);
        setAudioUrl(nextUrl);
        return () => {
            URL.revokeObjectURL(nextUrl);
        };
    }, [file]);
    const stopSegmentPlayback = useCallback(() => {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
            audio.pause();
        }
        segmentEndMsRef.current = null;
        setPlayingSegment(null);
    }, []);
    const handleAudioTimeUpdate = useCallback(() => {
        const audio = audioRef.current;
        if (!audio)
            return;
        const currentMs = audio.currentTime * 1000;
        setAudioCurrentMs(currentMs);
        if (segmentEndMsRef.current != null && currentMs >= segmentEndMsRef.current - 30) {
            audio.pause();
            audio.currentTime = segmentEndMsRef.current / 1000;
            segmentEndMsRef.current = null;
            setPlayingSegment(null);
        }
    }, []);
    const handlePlaySegment = useCallback(async (segmentIndex: number) => {
        if (!result || !audioUrl)
            return;
        const segment = result.segments[segmentIndex];
        const audio = audioRef.current;
        if (!segment || !audio)
            return;
        const startMs = Math.max(0, segment.start_ms);
        const endMs = Math.max(startMs + 120, segment.end_ms);
        if (playingSegment === segmentIndex && !audio.paused) {
            stopSegmentPlayback();
            return;
        }
        if (audio.src !== audioUrl) {
            audio.src = audioUrl;
        }
        if (audio.readyState < 1) {
            await new Promise<void>((resolve) => {
                const onReady = () => {
                    audio.removeEventListener("loadedmetadata", onReady);
                    resolve();
                };
                audio.addEventListener("loadedmetadata", onReady);
                audio.load();
            });
        }
        audio.currentTime = startMs / 1000;
        segmentEndMsRef.current = endMs;
        setAudioCurrentMs(startMs);
        setPlayingSegment(segmentIndex);
        setActiveSegment(segmentIndex);
        try {
            await audio.play();
        }
        catch {
            segmentEndMsRef.current = null;
            setPlayingSegment(null);
        }
    }, [audioUrl, playingSegment, result, stopSegmentPlayback]);

    const handleFile = useCallback(async (f: File) => {
        stopSegmentPlayback();
        setAudioCurrentMs(0);
        setFile(f);
        setError(null);
        setResult(null);
        setStatus("uploading");
        try {
            setStatus("transcribing");
            const data = await transcribeAudio(f, (s) => setStatus(s as UploadStatus));
            setResult(data);
            setStatus("done");
            setActiveTab(data.segments.length > 0 ? "transcript" : "insights");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "transcription failed");
            setStatus("error");
        }
    }, [stopSegmentPlayback]);
    const loadLibrary = useCallback(async () => {
        setLibraryStatus("loading");
        setLibraryError(null);
        try {
            const files = await listLibraryAudio();
            setLibraryItems(files);
            setLibraryStatus("ready");
        }
        catch (err) {
            setLibraryError(err instanceof Error ? err.message : "failed to load library");
            setLibraryStatus("error");
        }
    }, []);
    useEffect(() => {
        if (activeSection !== "library" && activeSection !== "voice") {
            return;
        }
        if (libraryStatus === "idle") {
            void loadLibrary();
        }
    }, [activeSection, libraryStatus, loadLibrary]);
    const handleAnalyzeLibraryItem = useCallback(async (item: LibraryAudioItem) => {
        setActiveLibraryItemUrl(item.url);
        setActiveSection("dashboard");
        setActiveTab("transcript");
        try {
            const selectedFile = await fetchPublicAudioFile(item);
            await handleFile(selectedFile);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "failed to load library file");
            setStatus("error");
        }
        finally {
            setActiveLibraryItemUrl(null);
        }
    }, [handleFile]);
    const handleSelectSection = useCallback((section: AppSection) => {
        setActiveSection(section);
    }, []);
    const handleClear = useCallback(() => {
        stopSegmentPlayback();
        setAudioCurrentMs(0);
        setFile(null);
        setResult(null);
        setError(null);
        setStatus("idle");
        setActiveSegment(null);
    }, [stopSegmentPlayback]);
    const handleCopy = useCallback(async () => {
        if (!result)
            return;
        await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [result]);
    const isProcessing = status === "uploading" || status === "transcribing" || status === "analyzing" || status === "finalizing";
    const hasResult = result && status === "done";
    const heading = activeSection === "dashboard"
        ? "Dashboard"
        : activeSection === "library"
            ? "Library"
            : activeSection === "voice"
                ? "Voice"
                : "Settings";
    const selectedSegment = result && activeSegment !== null
        ? (result.segments[activeSegment] ?? null)
        : null;
    const selectedNativeText = selectedSegment
        ? (selectedSegment.original_text ?? selectedSegment.text)
        : "";
    const selectedScriptStyle = selectedNativeText
        ? detectScriptStyle(selectedNativeText)
        : null;
    const selectedSegmentIndex = selectedSegment && activeSegment !== null
        ? activeSegment
        : null;
    const selectedSegmentProgress = selectedSegment && selectedSegmentIndex !== null && playingSegment === selectedSegmentIndex
        ? (audioCurrentMs - selectedSegment.start_ms)
            / Math.max(1, selectedSegment.end_ms - selectedSegment.start_ms)
        : 0;
    const activeVoiceRecording = useMemo<VoiceAgentActiveRecording | null>(() => {
        if (!result)
            return null;
        const transcriptSegments = result.segments.map((seg) => ({
            text: seg.original_text ?? seg.text,
            startSecond: seg.start_ms / 1000,
            endSecond: seg.end_ms / 1000,
        }));
        const transcriptText = transcriptSegments.map((seg) => seg.text).join(" ").trim()
            || result.segments.map((seg) => seg.text).join(" ").trim();
        const name = file?.name ?? "Current Upload";
        return {
            name,
            url: audioUrl ?? "",
            index: 0,
            analyzedAt: new Date().toISOString(),
            transcript: {
                text: transcriptText,
                language: result.language,
                durationInSeconds: result.duration_s,
                segments: transcriptSegments,
            },
            analysis: buildVoiceAgentAnalysis(result),
        };
    }, [audioUrl, file?.name, result]);
    const showVoiceOrb = activeSection === "voice"
        || (activeSection === "dashboard" && Boolean(hasResult));
    return (<div className="h-dvh w-dvw flex overflow-hidden bg-background">

        <LeftSidebar activeSection={activeSection} onSelect={handleSelectSection} />


        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <audio ref={audioRef} src={audioUrl ?? undefined} preload="metadata" onTimeUpdate={handleAudioTimeUpdate} onPause={() => {
                    if (segmentEndMsRef.current != null) {
                        segmentEndMsRef.current = null;
                        setPlayingSegment(null);
                    }
                }} onEnded={() => {
                    segmentEndMsRef.current = null;
                    setPlayingSegment(null);
                }} className="hidden" />

            <div className="shrink-0 h-14 flex items-center justify-between px-5 border-b border-border/40 bg-card/30">

                <div className="flex items-center gap-3">
                    <h1 className="text-sm font-semibold text-foreground">{heading}</h1>
                    {isProcessing && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary animate-pulse rounded-full" />
                        <Shimmer as="span" className="font-mono text-[10px] tracking-[0.2em] uppercase" duration={1.5}>
                            {status === "uploading" ? "ingesting" : status === "transcribing" ? "transcribing" : status === "analyzing" ? "analyzing" : "finalizing"}
                        </Shimmer>
                    </motion.div>)}
                </div>


                {hasResult && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                        {result.recording_id.slice(0, 8)}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                        {result.segments.length} seg
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/50 tabular-nums">
                        {result.language?.toUpperCase()}
                    </span>
                </motion.div>)}


                <div className="flex items-center gap-3">
                    {hasResult && (<button onClick={handleClear} className="font-mono text-[11px] text-muted-foreground/50 hover:text-foreground/70 transition-colors px-3 py-1.5 rounded-md border border-border/40 hover:border-border bg-card/20">
                        clear
                    </button>)}
                    {status === "error" && (<span className="font-mono text-[11px] text-destructive">error</span>)}
                    <div className={cn("w-2 h-2 rounded-full", status === "done" ? "bg-secondary" : status === "error" ? "bg-destructive" : "bg-muted-foreground/20")} />
                </div>
            </div>


            <div className="flex-1 flex overflow-hidden">

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {activeSection === "library" ? (<LibraryPanel items={libraryItems} status={libraryStatus} error={libraryError} onAnalyze={handleAnalyzeLibraryItem} activeItemUrl={activeLibraryItemUrl} />) : activeSection === "voice" ? (<VoicePanel items={libraryItems} status={libraryStatus} error={libraryError} />) : activeSection === "settings" ? (<div className="h-full flex items-center justify-center px-8">
                        <p className="text-sm text-muted-foreground/70 text-center">
                            Settings are not configured yet.
                        </p>
                    </div>) : (<>
                        {hasResult && (<div className="shrink-0 h-10 flex items-center gap-0 border-b border-border/30 px-1 bg-card/10">
                            {(["transcript", "insights", "json"] as const).map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={cn("h-full px-4 font-mono text-[11px] tracking-wider uppercase transition-colors relative font-medium", activeTab === tab
                                ? "text-foreground"
                                : "text-muted-foreground/40 hover:text-muted-foreground/70")}>
                                {tab}
                                {activeTab === tab && (<motion.div layoutId="left-tab" className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" transition={{ type: "spring", stiffness: 400, damping: 30 }} />)}
                            </button>))}
                        </div>)}


                        <div className="flex-1 overflow-hidden">
                            <AnimatePresence mode="wait">

                                {!hasResult && status !== "error" && (<motion.div key="upload-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="h-full flex flex-col p-5">
                                    <DropZone onFile={handleFile} processing={isProcessing} file={file} status={status} />
                                </motion.div>)}


                                {status === "error" && (<motion.div key="error-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center gap-4">
                                    <p className="font-mono text-sm text-destructive/70">{error}</p>
                                    <button onClick={handleClear} className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground/50 hover:text-foreground/70 border-2 border-border px-4 py-2 rounded-lg transition-colors neo-card">
                                        retry
                                    </button>
                                </motion.div>)}


                                {hasResult && activeTab === "transcript" && (<motion.div key="transcript" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                    {result.segments.length > 0 ? (
                                    <ScrollArea className="h-full">
                                        {audioUrl && (<div className="sticky top-0 z-10 border-b border-border/35 bg-background/95 backdrop-blur px-3 py-2.5">
                                            <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground/55 mb-1.5">
                                                Source Audio
                                            </p>
                                            <audio src={audioUrl} controls preload="metadata" className="w-full h-9 rounded-md" />
                                            <p className="text-[10px] text-muted-foreground/55 mt-1.5">
                                                Use each segment’s play button to hear the exact transcript slice.
                                            </p>
                                        </div>)}
                                        {result.segments.map((seg, i) => {
                                            const segmentDuration = Math.max(1, seg.end_ms - seg.start_ms);
                                            const segmentProgress = playingSegment === i
                                                ? (audioCurrentMs - seg.start_ms) / segmentDuration
                                                : 0;
                                            return (<SegRow key={i} seg={seg} index={i} isActive={activeSegment === i} isPlaying={playingSegment === i} segmentProgress={segmentProgress} hasAudio={Boolean(audioUrl)} onClick={() => setActiveSegment(activeSegment === i ? null : i)} onPlaySegment={() => {
                                                    void handlePlaySegment(i);
                                                }} />);
                                        })}
                                    </ScrollArea>
                                    ) : (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 px-8">
                                        <div className="text-center space-y-2">
                                            <p className="text-sm text-muted-foreground/70">No transcript segments available</p>
                                            <p className="text-[11px] text-muted-foreground/50">The audio was processed but individual segments could not be extracted. Check the Insights tab for analysis results.</p>
                                        </div>
                                        <button onClick={() => setActiveTab("insights")} className="font-mono text-[11px] tracking-wider uppercase text-primary hover:text-primary/80 border border-primary/30 px-4 py-2 rounded-lg transition-colors">
                                            View Insights
                                        </button>
                                    </div>
                                    )}
                                </motion.div>)}


                                {hasResult && activeTab === "json" && (<motion.div key="json" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-full">
                                    <ScrollArea className="h-full">
                                        <pre className="p-5 font-mono text-[11px] leading-[1.7] text-foreground/50 whitespace-pre">
                                            {JSON.stringify(result, null, 2)}
                                        </pre>
                                    </ScrollArea>
                                    <button onClick={handleCopy} className="absolute top-3 right-3 font-mono text-[10px] tracking-wider uppercase text-muted-foreground/40 hover:text-foreground/60 border border-border px-3 py-1.5 rounded-md transition-colors bg-card/80 backdrop-blur-sm">
                                        {copied ? "copied ✓" : "copy"}
                                    </button>
                                </motion.div>)}

                                {hasResult && activeTab === "insights" && (<motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                    <ScrollArea className="h-full">
                                        <div className="p-5">
                                            {result.ui_spec ? (<InsightsRenderer spec={result.ui_spec} />) : (<InsightsFallback>
                                                No insights spec returned yet.
                                            </InsightsFallback>)}
                                        </div>
                                    </ScrollArea>
                                </motion.div>)}
                            </AnimatePresence>
                        </div>
                    </>)}
                </div>


                <div className="w-72 shrink-0 flex flex-col border-l border-border/30 overflow-hidden bg-card/20 min-h-0">

                    <div className="shrink-0 h-10 flex items-center px-4 border-b border-border/30">
                        <span className="text-[11px] tracking-wide uppercase text-muted-foreground/60 font-semibold">
                            {hasResult ? "Analysis" : "Pipeline"}
                        </span>
                    </div>


                    <ScrollArea className="flex-1 min-h-0">
                        <AnimatePresence mode="wait">

                            {!hasResult && (<motion.div key="sidebar-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-6">

                                {isProcessing ? (
                                    <PipelineStepper status={status} />
                                ) : (
                                    <>
                                <div className="space-y-3">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        How it works
                                    </p>
                                    {[
                                        { step: "1", name: "Ingest", desc: "Audio normalization, noise profiling, and codec detection" },
                                        { step: "2", name: "Transcribe", desc: "Fintech-tuned ASR with speaker diarization" },
                                        { step: "3", name: "Analyze", desc: "Entity extraction, intent classification, and obligation detection" },
                                    ].map((stage) => (<div key={stage.step} className="flex gap-3 items-start">
                        <div className="w-5 h-5 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-[10px] font-semibold text-primary tabular-nums">
                                                {stage.step}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-semibold text-foreground/80">
                                                {stage.name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground/50 leading-relaxed mt-0.5">
                                                {stage.desc}
                                            </p>
                                        </div>
                                    </div>))}
                                </div>

                                <div className="h-px bg-border/40" />


                                <div className="space-y-2">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Capabilities
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            "Entity Extraction",
                                            "Intent Analysis",
                                            "Obligation Detection",
                                            "Confidence Scoring",
                                            "Speaker Diarization",
                                        ].map((cap) => (<span key={cap} className="text-[10px] text-muted-foreground/70 bg-muted/30 border border-border/40 px-2 py-1 rounded-md">
                                            {cap}
                                        </span>))}
                                    </div>
                                </div>

                                <div className="h-px bg-border/40" />


                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: "Latency", value: "<2s" },
                                        { label: "Accuracy", value: "99.1%" },
                                        { label: "Languages", value: "12" },
                                        { label: "Formats", value: "50+" },
                                    ].map((stat) => (<div key={stat.label} className="text-center">
                                        <p className="text-base font-bold text-primary tabular-nums font-mono">
                                            {stat.value}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                            {stat.label}
                                        </p>
                                    </div>))}
                                </div>
                                    </>
                                )}
                            </motion.div>)}


                            {hasResult && (<motion.div key="sidebar-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-5">

                                {/* Summary */}
                                {result.insights?.summary && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="space-y-2"
                                    >
                                        <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                            Summary
                                        </p>
                                        <div className="bg-primary/[0.04] border border-primary/15 rounded-lg p-3">
                                            <p className="text-[12px] leading-[1.65] text-foreground/75">
                                                {result.insights.summary}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Recording
                                    </p>
                                    <div className="bg-muted/20 border border-border/30 rounded-lg p-3 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">ID</span>
                                            <span className="font-mono text-[11px] text-foreground/70 tabular-nums">
                                                {result.recording_id.slice(0, 12)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">Duration</span>
                                            <span className="font-mono text-[11px] text-foreground/70 tabular-nums">
                                                {result.duration_s?.toFixed(1)}s
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">Segments</span>
                                            <span className="font-mono text-[11px] text-foreground/70 tabular-nums">
                                                {result.segments.length}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">Language</span>
                                            <span className="text-[11px] text-foreground/70">
                                                {result.language?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>


                                {result.insights?.primary_intent && (<div className="space-y-2">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Intent
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-semibold text-primary capitalize">
                                            {result.insights.primary_intent.replace(/_/g, " ")}
                                        </span>
                                        {result.insights.intent_confidence != null && (
                                            <span className="font-mono text-[9px] text-muted-foreground/40 tabular-nums">
                                                {(result.insights.intent_confidence * 100).toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                    {result.insights.secondary_intents?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {result.insights.secondary_intents.map((si, i) => (
                                                <span key={i} className="text-[9px] text-muted-foreground/50 bg-muted/30 rounded px-1.5 py-0.5 capitalize">
                                                    {si.replace(/_/g, " ")}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>)}


                                {result.insights?.entities?.length > 0 && (<div className="space-y-2">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Entities
                                    </p>
                                    <div className="border border-border/40 rounded-lg overflow-hidden divide-y divide-border/30">
                                        {result.insights.entities.map((e, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2">
                                                <span className="text-[10px] text-muted-foreground/60 capitalize">
                                                    {e.type.replace(/_/g, " ")}
                                                </span>
                                                <span className="text-[12px] text-foreground/80 font-medium tabular-nums">
                                                    {e.currency && `${e.currency} `}{String(e.value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>)}


                                <div className="space-y-2">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Audio Quality
                                    </p>
                                    <div className="space-y-2.5">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-muted-foreground/60">Call Quality</span>
                                                <span className="font-mono text-[11px] text-foreground/70 tabular-nums font-medium">
                                                    {(result.insights.ingestion.call_quality_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-border/40 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{ width: `${result.insights.ingestion.call_quality_score * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">Noise Level</span>
                                            <span className={cn(
                                                "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                                                result.insights.ingestion.noise_level === "low" && "bg-primary/10 text-primary",
                                                result.insights.ingestion.noise_level === "medium" && "bg-chart-3/10 text-chart-3",
                                                result.insights.ingestion.noise_level === "high" && "bg-destructive/10 text-destructive",
                                            )}>
                                                {result.insights.ingestion.noise_level}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">Speakers</span>
                                            <span className="text-[11px] text-foreground/70 font-medium">
                                                {result.insights.ingestion.speaker_diarization.speaker_count}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">Tamper Risk</span>
                                            <span className={cn(
                                                "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                                                result.insights.ingestion.tamper_replay_risk === "low" && "bg-primary/10 text-primary",
                                                result.insights.ingestion.tamper_replay_risk === "medium" && "bg-chart-3/10 text-chart-3",
                                                result.insights.ingestion.tamper_replay_risk === "high" && "bg-destructive/10 text-destructive",
                                            )}>
                                                {result.insights.ingestion.tamper_replay_risk}
                                            </span>
                                        </div>
                                    </div>
                                </div>


                                {(result.insights?.sentiment || result.insights?.risk_level) && (<div className="space-y-2">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Signals
                                    </p>
                                    <div className="flex gap-2">
                                        {result.insights.sentiment && (
                                            <span className={cn(
                                                "text-[10px] font-medium px-2.5 py-1 rounded-lg border capitalize",
                                                result.insights.sentiment === "positive" && "bg-primary/5 border-primary/20 text-primary",
                                                result.insights.sentiment === "negative" && "bg-destructive/5 border-destructive/20 text-destructive",
                                                result.insights.sentiment === "neutral" && "bg-muted/30 border-border/40 text-muted-foreground/60",
                                                result.insights.sentiment === "mixed" && "bg-chart-3/5 border-chart-3/20 text-chart-3",
                                            )}>
                                                {result.insights.sentiment}
                                            </span>
                                        )}
                                        {result.insights.risk_level && (
                                            <span className={cn(
                                                "text-[10px] font-medium px-2.5 py-1 rounded-lg border capitalize",
                                                result.insights.risk_level === "low" && "bg-primary/5 border-primary/20 text-primary",
                                                result.insights.risk_level === "medium" && "bg-chart-3/5 border-chart-3/20 text-chart-3",
                                                result.insights.risk_level === "high" && "bg-destructive/5 border-destructive/20 text-destructive",
                                            )}>
                                                {result.insights.risk_level} risk
                                            </span>
                                        )}
                                    </div>
                                </div>)}


                                <div className="space-y-2">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Review Status
                                    </p>
                                    <div className="bg-muted/20 border border-border/30 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full shrink-0",
                                                result.insights.review.needs_human_review ? "bg-chart-3" : "bg-primary"
                                            )} />
                                            <span className="text-[12px] font-medium text-foreground/80">
                                                {result.insights.review.needs_human_review ? "Human Review Required" : "Auto-Approved"}
                                            </span>
                                        </div>
                                        {result.insights.review.review_reasons.slice(0, 3).map((reason, i) => (
                                            <p key={i} className="text-[11px] leading-[1.5] text-muted-foreground/60 pl-4 border-l-2 border-border/50">
                                                {reason}
                                            </p>
                                        ))}
                                    </div>
                                </div>


                                {result.insights?.obligations?.length > 0 && (<div className="space-y-2">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Obligations
                                    </p>
                                    <div className="space-y-2">
                                        {result.insights.obligations.map((ob, i) => (<div key={i} className="bg-primary/[0.04] border border-primary/15 rounded-lg p-2.5">
                                            <p className="text-[11px] leading-[1.6] text-foreground/70 italic">
                                                {ob.text}
                                            </p>
                                            {(ob.speaker || ob.due_date) && (
                                                <div className="flex gap-3 mt-1.5">
                                                    {ob.speaker && (
                                                        <span className="text-[9px] text-muted-foreground/50">
                                                            {ob.speaker}
                                                        </span>
                                                    )}
                                                    {ob.due_date && (
                                                        <span className="text-[9px] text-primary/70">
                                                            Due: {ob.due_date}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>))}
                                    </div>
                                </div>)}


                                {selectedSegment && (<motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-3 border-t border-border/30">
                                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">
                                        Segment {(selectedSegmentIndex ?? 0) + 1}
                                    </p>
                                    <div className="bg-muted/20 border border-border/30 rounded-lg p-3 space-y-2">
                                        <button type="button" onClick={() => {
                                                if (selectedSegmentIndex !== null) {
                                                    void handlePlaySegment(selectedSegmentIndex);
                                                }
                                            }} disabled={!audioUrl} className={cn("w-full inline-flex items-center justify-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors", audioUrl
                                            ? "border-primary/30 bg-primary/[0.08] text-primary hover:bg-primary/[0.14]"
                                            : "border-border/40 bg-muted/30 text-muted-foreground/35 cursor-not-allowed")}>
                                            {playingSegment === selectedSegmentIndex ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                            {playingSegment === selectedSegmentIndex ? "Pause Segment" : "Play Segment"}
                                        </button>
                                        {playingSegment === selectedSegmentIndex && (<div className="h-1.5 w-full rounded-full bg-primary/12 overflow-hidden">
                                            <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${Math.max(0, Math.min(100, selectedSegmentProgress * 100)).toFixed(1)}%` }} />
                                        </div>)}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">Time</span>
                                            <span className="font-mono text-[11px] text-foreground/70 tabular-nums">
                                                {formatMs(selectedSegment.start_ms)} → {formatMs(selectedSegment.end_ms)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-muted-foreground/60">Duration</span>
                                            <span className="font-mono text-[11px] text-foreground/70 tabular-nums">
                                                {selectedSegment.end_ms - selectedSegment.start_ms}ms
                                            </span>
                                        </div>
                                        {selectedSegment.confidence != null && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-muted-foreground/60">Confidence</span>
                                                <span className="font-mono text-[11px] text-foreground/70 tabular-nums">
                                                    {(selectedSegment.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        )}
                                        {selectedNativeText && selectedScriptStyle && (<div className={cn("rounded-md border px-2.5 py-2 space-y-1", selectedScriptStyle.toneClass)}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-mono text-[9px] tracking-[0.14em] uppercase opacity-80">
                                                    Native Script
                                                </span>
                                                <span className="font-mono text-[9px] tracking-wide uppercase opacity-75">
                                                    {selectedScriptStyle.label}
                                                </span>
                                            </div>
                                            <p dir={selectedScriptStyle.direction ?? "ltr"} style={{ fontFamily: selectedScriptStyle.fontFamily }} className="text-[15px] leading-[1.8] text-foreground/85 break-words">
                                                {selectedNativeText}
                                            </p>
                                        </div>)}
                                    </div>
                                </motion.div>)}
                            </motion.div>)}
                        </AnimatePresence>
                    </ScrollArea>
                </div>
            </div>

            {/* Voice Agent orb is available in voice mode and post-analysis dashboard mode */}
            {showVoiceOrb && (
                <MinimalVoiceAgent
                    dockedLeft={
                        activeSection === "voice"
                            ? 260
                            : activeSection === "dashboard" && hasResult
                                ? 800
                                : 86
                    }
                    preloadedRecording={activeVoiceRecording}
                />
            )}
        </div>
    </div>);
}
