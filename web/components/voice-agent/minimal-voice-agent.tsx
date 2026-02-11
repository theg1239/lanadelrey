"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Orb, type AgentState } from "@/components/ui/orb";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type TurnResponse = {
  userText: string;
  assistantText: string;
  audio?: { base64: string; mediaType: string; format: string };
  toolResults?: Array<{
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    input: unknown;
    output: unknown;
    dynamic?: boolean;
    preliminary?: boolean;
  }>;
  error?: string;
};

const pickRecorderMimeType = (): string | undefined => {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const mt of candidates) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  return undefined;
};

const base64ToBytes = (base64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const bytesToObjectUrl = (bytes: Uint8Array<ArrayBuffer>, mediaType: string): string => {
  // Create a copy so the buffer type is a plain ArrayBuffer (DOM typings reject SharedArrayBuffer).
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: mediaType || "audio/mpeg" });
  return URL.createObjectURL(blob);
};

type ChatEntry = { role: "user" | "assistant"; content: string };

type MinimalVoiceAgentProps = {
  dockedLeft?: number;
  dockedRight?: number;
  dockedBottom?: number;
  preloadedRecording?: ActiveRecording | null;
};

export type RecordingTranscriptSegment = {
  text: string;
  startSecond: number;
  endSecond: number;
};

export type RecordingAnalysis = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  topics: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
};

export type ActiveRecording = {
  name: string;
  url: string;
  index: number;
  analyzedAt: string;
  transcript: {
    text: string;
    language?: string;
    durationInSeconds?: number;
    segments: RecordingTranscriptSegment[];
  };
  analysis: RecordingAnalysis;
};

const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function MinimalVoiceAgent({
  dockedLeft = 60,
  dockedRight,
  dockedBottom = 20,
  preloadedRecording = null,
}: MinimalVoiceAgentProps) {
  const [agentState, setAgentState] = useState<AgentState>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const [lastAssistantText, setLastAssistantText] = useState<string | null>(null);
  const [activeRecording, _setActiveRecording] = useState<ActiveRecording | null>(null);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [activityLabel, setActivityLabel] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastAudioUrlRef = useRef<string | null>(null);
  const historyRef = useRef<ChatEntry[]>([]);
  const progressIntervalRef = useRef<number | null>(null);
  const activeTurnIdRef = useRef<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackIdRef = useRef(0);

  const meteringRafRef = useRef<number | null>(null);
  const inputLevelRef = useRef(0);
  const outputLevelRef = useRef(0);
  const inputBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const outputBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const colorsRef = useRef<[string, string]>(["#CADCFC", "#A0B9D1"]);

  const activeRecordingRef = useRef<ActiveRecording | null>(null);
  const setActiveRecording = useCallback((rec: ActiveRecording | null) => {
    activeRecordingRef.current = rec;
    _setActiveRecording(rec);
  }, []);

  useEffect(() => {
    if (!preloadedRecording) return;
    const current = activeRecordingRef.current;
    const sameRecording =
      current?.name === preloadedRecording.name
      && current?.analyzedAt === preloadedRecording.analyzedAt;
    if (!sameRecording) {
      setActiveRecording(preloadedRecording);
    }
  }, [preloadedRecording, setActiveRecording]);

  /* ── helpers ─────────────────────────────────────────────── */

  const stopProgressPolling = useCallback(() => {
    if (progressIntervalRef.current != null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    activeTurnIdRef.current = null;
    setActivityLabel(null);
  }, []);

  const startProgressPolling = useCallback(
    (turnId: string) => {
      stopProgressPolling();
      activeTurnIdRef.current = turnId;
      setActivityLabel("Processing");

      const tick = async () => {
        if (activeTurnIdRef.current !== turnId) return;
        try {
          const res = await fetch(`/api/voice-agent/progress?turnId=${encodeURIComponent(turnId)}`, {
            method: "GET",
            cache: "no-store",
          });
          const data = (await res.json().catch(() => null)) as
            | { statusKey?: string; label?: string }
            | null;
          const label = typeof data?.label === "string" ? data.label.trim() : "";
          const statusKey = typeof data?.statusKey === "string" ? data.statusKey : "idle";
          if (!label || statusKey === "idle") return;
          setActivityLabel(label);
        } catch {
          // ignore polling errors
        }
      };

      void tick();
      progressIntervalRef.current = window.setInterval(() => void tick(), 250);
    },
    [stopProgressPolling],
  );

  const stopAudio = useCallback(() => {
    try {
      outputSourceRef.current?.stop(0);
    } catch {
      // ignore
    }
    outputSourceRef.current = null;
    outputLevelRef.current = 0;
    playbackIdRef.current += 1;
  }, []);

  const clearAudio = useCallback(() => {
    stopAudio();
    if (lastAudioUrlRef.current) {
      URL.revokeObjectURL(lastAudioUrlRef.current);
      lastAudioUrlRef.current = null;
    }
    setLastAudioUrl(null);
  }, [stopAudio]);

  const startMetering = useCallback(() => {
    if (meteringRafRef.current != null) return;

    const tick = () => {
      const inputAnalyser = inputAnalyserRef.current;
      const outputAnalyser = outputAnalyserRef.current;

      if (inputAnalyser) {
        if (!inputBufRef.current || inputBufRef.current.length !== inputAnalyser.fftSize) {
          inputBufRef.current = new Uint8Array(inputAnalyser.fftSize);
        }
        const buf = inputBufRef.current;
        inputAnalyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const scaled = clamp01(rms * 3);
        inputLevelRef.current = inputLevelRef.current * 0.85 + scaled * 0.15;
      } else {
        inputLevelRef.current *= 0.9;
      }

      if (outputAnalyser) {
        if (!outputBufRef.current || outputBufRef.current.length !== outputAnalyser.fftSize) {
          outputBufRef.current = new Uint8Array(outputAnalyser.fftSize);
        }
        const buf = outputBufRef.current;
        outputAnalyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const scaled = clamp01(rms * 3);
        outputLevelRef.current = outputLevelRef.current * 0.85 + scaled * 0.15;
      } else {
        outputLevelRef.current *= 0.9;
      }

      meteringRafRef.current = window.requestAnimationFrame(tick);
    };

    meteringRafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === "undefined") return null;

    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();

      const inputAnalyser = ctx.createAnalyser();
      inputAnalyser.fftSize = 1024;
      inputAnalyserRef.current = inputAnalyser;

      const outGain = ctx.createGain();
      outGain.gain.value = 1;
      outputGainRef.current = outGain;

      const outAnalyser = ctx.createAnalyser();
      outAnalyser.fftSize = 1024;
      outputAnalyserRef.current = outAnalyser;

      // Route: source -> gain -> analyser -> destination
      outGain.connect(outAnalyser);
      outAnalyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
    }

    try {
      if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
    } catch {
      // ignore
    }

    startMetering();
    return audioCtxRef.current;
  }, [startMetering]);

  const ensureMic = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    streamRef.current = s;

    // Connect mic to analyser for input-reactive orb (no output / no echo).
    const ctx = await ensureAudioContext();
    if (ctx && inputAnalyserRef.current && !inputSourceRef.current) {
      try {
        const src = ctx.createMediaStreamSource(s);
        src.connect(inputAnalyserRef.current);
        inputSourceRef.current = src;
      } catch {
        // ignore
      }
    }

    return s;
  }, [ensureAudioContext]);

  /* ── send turn to API ───────────────────────────────────── */

  const sendTurn = useCallback(
    async (audioBlob: Blob) => {
      const mime = audioBlob.type || "audio/webm";
      const fd = new FormData();
      const turnId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      fd.append("audio", audioBlob, `utterance.${mime.includes("mp4") ? "mp4" : "webm"}`);
      fd.append("messages", JSON.stringify(historyRef.current.slice(-12)));
      fd.append("turnId", turnId);
      fd.append(
        "callState",
        JSON.stringify({
          agentState,
          activeRecordingName: activeRecordingRef.current?.name ?? null,
          activeRecordingIndex: activeRecordingRef.current?.index ?? null,
          activeRecordingSummary: activeRecordingRef.current?.analysis?.summary ?? null,
          activeRecordingLanguage: activeRecordingRef.current?.transcript?.language ?? null,
          activeRecordingDurationInSeconds:
            activeRecordingRef.current?.transcript?.durationInSeconds ?? null,
          activeRecordingTranscriptText: activeRecordingRef.current?.transcript?.text ?? null,
          activeRecordingSegments: activeRecordingRef.current?.transcript?.segments ?? [],
          activeRecordingAnalysis: activeRecordingRef.current?.analysis ?? null,
        }),
      );

      startProgressPolling(turnId);
      try {
        const res = await fetch("/api/voice-agent/turn", { method: "POST", body: fd });
        const payload = (await res.json().catch(() => null)) as TurnResponse | null;
        if (!res.ok) throw new Error(payload?.error ?? `Voice agent error (${res.status})`);
        if (!payload) throw new Error("Empty response from voice agent.");
        return payload;
      } finally {
        stopProgressPolling();
      }
    },
    [agentState, startProgressPolling, stopProgressPolling],
  );

  const playTtsAudio = useCallback(
    async (base64: string, mediaType: string) => {
      const ctx = await ensureAudioContext();
      if (!ctx || !outputGainRef.current) throw new Error("No audio context available.");

      stopAudio();
      const playbackId = (playbackIdRef.current += 1);

      const bytes = base64ToBytes(base64);
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(outputGainRef.current);
      outputSourceRef.current = src;

      setAgentState("talking");

      await new Promise<void>((resolve) => {
        src.addEventListener(
          "ended",
          () => {
            resolve();
          },
          { once: true },
        );
        src.start(0);
      });

      outputSourceRef.current = null;
      if (playbackIdRef.current === playbackId) {
        setAgentState(null);
      }
    },
    [ensureAudioContext, stopAudio],
  );

  const handleToolResults = useCallback(
    (results: TurnResponse["toolResults"]) => {
      if (!Array.isArray(results)) return;
      for (const r of results) {
        if (!r || typeof r !== "object") continue;
        if (r.toolName === "analyze_recording") {
          const out = (r.output ?? null) as
            | {
                recording?: ActiveRecording;
              }
            | null;
          if (out?.recording && typeof out.recording === "object") {
            setActiveRecording(out.recording);
          }
        }
        if (r.toolName === "list_recordings") {
          // no-op for now (UI can rely on voice commands)
        }
      }
    },
    [setActiveRecording],
  );

  /* ── recording stop handler ─────────────────────────────── */

  const handleRecordingStop = useCallback(
    async (mimeType: string) => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
      chunksRef.current = [];
      mediaRecorderRef.current = null;

      if (blob.size < 8_000) {
        setAgentState(null);
        return;
      }

      setAgentState("thinking");

      try {
        const payload = await sendTurn(blob);

        const uText = payload.userText?.trim() || null;
        const aText = payload.assistantText?.trim() || null;
        setLastUserText(uText);
        setLastAssistantText(aText);

        handleToolResults(payload.toolResults);

        if (uText) {
          historyRef.current.push({ role: "user", content: uText });
        }
        if (aText) {
          historyRef.current.push({ role: "assistant", content: aText });
        }

        if (payload.audio?.base64) {
          const bytes = base64ToBytes(payload.audio.base64);
          const url = bytesToObjectUrl(bytes, payload.audio.mediaType);
          if (lastAudioUrlRef.current) URL.revokeObjectURL(lastAudioUrlRef.current);
          lastAudioUrlRef.current = url;
          setLastAudioUrl(url);
          try {
            await playTtsAudio(payload.audio.base64, payload.audio.mediaType);
          } catch (e) {
            console.error("TTS playback error:", e);
            setAgentState(null);
          }
        } else {
          setAgentState(null);
        }
      } catch (err) {
        console.error("Voice agent error:", err);
        setAgentState(null);
      }
    },
    [handleToolResults, playTtsAudio, sendTurn],
  );

  /* ── start / stop recording ─────────────────────────────── */

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === "recording") return;

    if (agentState === "talking") stopAudio();

    try {
      await ensureAudioContext(); // user gesture -> unlock audio for later playback
      const s = await ensureMic();
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => void handleRecordingStop(recorder.mimeType);

      recorder.start();
      setAgentState("listening");
      setLastUserText(null);
      setLastAssistantText(null);
    } catch (err) {
      console.error("Mic error:", err);
      setAgentState(null);
    }
  }, [agentState, ensureAudioContext, ensureMic, handleRecordingStop, stopAudio]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec?.state === "recording") {
      try { rec.stop(); } catch { /* ignore */ }
    }
  }, []);

  /* ── dismiss (tap outside / scrim) ───────────────────────── */

  const dismiss = useCallback(() => {
    // Cancel recording without sending
    const rec = mediaRecorderRef.current;
    if (rec?.state === "recording") {
      // remove the stop handler so it doesn't fire sendTurn
      rec.onstop = null;
      try { rec.stop(); } catch { /* ignore */ }
      chunksRef.current = [];
      mediaRecorderRef.current = null;
    }
    stopAudio();
    setAgentState(null);
  }, [stopAudio]);

  /* ── click handler ──────────────────────────────────────── */

  const handleClick = useCallback(() => {
    if (agentState === "thinking") return; // busy

    if (agentState === "listening") {
      stopRecording();
      return;
    }
    if (agentState === "talking") {
      stopAudio();
      setAgentState(null);
      return;
    }
    void startRecording();
  }, [agentState, startRecording, stopRecording, stopAudio]);

  /* ── audio element onended ──────────────────────────────── */

  const handleAudioEnded = useCallback(() => {
    // no-op: WebAudio handles state changes; controls audio is just for replay.
  }, []);

  /* ── cleanup on unmount ─────────────────────────────────── */

  useEffect(() => {
    return () => {
      stopProgressPolling();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (lastAudioUrlRef.current) {
        URL.revokeObjectURL(lastAudioUrlRef.current);
      }
      if (meteringRafRef.current != null) {
        window.cancelAnimationFrame(meteringRafRef.current);
        meteringRafRef.current = null;
      }
      try {
        audioCtxRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, [stopProgressPolling]);

  /* ── derived ────────────────────────────────────────────── */

  const isActive = agentState !== null; // listening, talking, or thinking

  useEffect(() => {
    if (agentState === "listening") colorsRef.current = ["#4ECDC4", "#CADCFC"];
    if (agentState === "thinking") colorsRef.current = ["#FFB703", "#A0B9D1"];
    if (agentState === "talking") colorsRef.current = ["#FF6B6B", "#4ECDC4"];
    if (agentState === null) colorsRef.current = ["#CADCFC", "#A0B9D1"];
  }, [agentState]);

  /* ── render ─────────────────────────────────────────────── */

  return (
    <>
      {/* Fallback replay controls */}
      {lastAudioUrl && (
        <div className="fixed z-[60] left-4 right-4 bottom-4 lg:left-auto lg:right-6 lg:w-[420px]">
          <div className="rounded-xl border border-border/40 bg-background/70 backdrop-blur p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60">
                last response audio
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px]"
                onClick={() => {
                  clearAudio();
                }}
              >
                clear
              </Button>
            </div>
            <audio
              controls
              src={lastAudioUrl}
              onEnded={handleAudioEnded}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Scrim / backdrop when active — tap to dismiss */}
      {isActive && (
        <div
          className="fixed inset-0 z-[51] bg-black/20 backdrop-blur-[2px] transition-opacity duration-500"
          style={{ opacity: 1 }}
          onClick={dismiss}
        />
      )}

      {/* Orb container — animates between corner and center */}
      <div
        className="fixed z-[52] flex flex-col items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          bottom: isActive ? "50%" : `${dockedBottom}px`,
          ...(isActive
            ? { left: "50%" }
            : (dockedRight != null ? { right: `${dockedRight}px` } : { left: `${dockedLeft}px` })),
          transform: isActive ? "translate(-50%, 50%)" : "translate(0, 0)",
        }}
      >
        <button
          onClick={handleClick}
          className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          title={
            agentState === "listening"
              ? "Click to stop"
              : agentState === "talking"
                ? "Click to interrupt"
                : agentState === "thinking"
                  ? "Thinking…"
                  : "Click to talk"
          }
        >
          <div
            className="bg-muted relative rounded-full p-0.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              width:  isActive ? 180 : 56,
              height: isActive ? 180 : 56,
            }}
          >
            <div className="bg-background h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_12px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_12px_rgba(0,0,0,0.3)]">
              <Orb
                colorsRef={colorsRef}
                seed={42}
                agentState={agentState}
                volumeMode="manual"
                getInputVolume={() => inputLevelRef.current}
                getOutputVolume={() => outputLevelRef.current}
              />
            </div>
          </div>
        </button>

        <span
          className={`text-[9px] tracking-widest uppercase select-none transition-all duration-300 ${
            isActive ? "text-white/70" : "text-muted-foreground/50"
          }`}
        >
          {agentState === "thinking" && activityLabel ? (
            <span
              style={
                {
                  ["--color-background" as unknown as string]: "rgba(255,255,255,0.92)",
                  ["--color-muted-foreground" as unknown as string]: "rgba(255,255,255,0.35)",
                } as unknown as CSSProperties
              }
            >
              <Shimmer as="span" className="font-mono text-[10px] tracking-[0.2em] uppercase" duration={1.3}>
                {activityLabel}
              </Shimmer>
            </span>
          ) : agentState === "listening" ? (
            "listening · tap to send"
          ) : agentState === "talking" ? (
            "speaking · tap to stop"
          ) : agentState === "thinking" ? (
            "thinking…"
          ) : (
            "agent"
          )}
        </span>

        {/* Active recording chip (persists even when idle) */}
        {activeRecording && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className={cn(
                  "text-[10px] font-mono transition-colors",
                  isActive ? "text-white/70 hover:text-white/90" : "text-muted-foreground/70 hover:text-foreground/80",
                  "underline underline-offset-4 decoration-white/15 hover:decoration-white/30",
                )}
                type="button"
              >
                recording {activeRecording.index}: {activeRecording.name}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">
                  Recording {activeRecording.index}: {activeRecording.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {activeRecording.analysis?.summary
                    ? activeRecording.analysis.summary
                    : "Say “recording 3” to analyze a library call."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60 mb-2">
                    analysis
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold text-foreground/80 mb-1">
                        Key points
                      </p>
                      <ul className="text-[11px] leading-relaxed text-muted-foreground/80 space-y-1">
                        {(activeRecording.analysis?.keyPoints ?? []).slice(0, 6).map((p, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground/40">•</span>
                            <span className="flex-1">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground/80 mb-1">
                        Action items
                      </p>
                      <ul className="text-[11px] leading-relaxed text-muted-foreground/80 space-y-1">
                        {(activeRecording.analysis?.actionItems ?? []).slice(0, 6).map((p, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground/40">•</span>
                            <span className="flex-1">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60 mb-2">
                    transcript
                  </p>
                  <ScrollArea className="h-[52vh] pr-3">
                    <div className="space-y-2">
                      {(activeRecording.transcript?.segments ?? []).length > 0 ? (
                        (activeRecording.transcript.segments ?? []).map((seg, i) => (
                          <div
                            key={i}
                            className="rounded-md border border-border/40 bg-background/50 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                                {formatClock(seg.startSecond)} → {formatClock(seg.endSecond)}
                              </span>
                            </div>
                            <p className="text-[12px] leading-relaxed text-foreground/80 mt-1">
                              {seg.text}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground/70">
                          No segments yet. Say “recording {activeRecording.index}” to re-analyze.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Transcription below orb */}
        {isActive && (lastUserText || lastAssistantText || !activeRecording) && (
          <div className="mt-2 max-w-sm w-[320px] text-center space-y-2 transition-all duration-300">
            {lastUserText && (
              <p className="text-[11px] leading-relaxed text-white/40 italic">
                {lastUserText}
              </p>
            )}
            {lastAssistantText && (
              <p className="text-[13px] leading-relaxed text-white/80">
                {lastAssistantText}
              </p>
            )}
            {!activeRecording && !lastUserText && !lastAssistantText && (
              <p className="text-[11px] leading-relaxed text-white/35">
                Try: “recording 3” or “analyze Sample3”
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
