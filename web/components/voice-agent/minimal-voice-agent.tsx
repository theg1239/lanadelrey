"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Orb, type AgentState } from "@/components/ui/orb";

type TurnResponse = {
  userText: string;
  assistantText: string;
  audio?: { base64: string; mediaType: string; format: string };
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

const base64ToObjectUrl = (base64: string, mediaType: string): string => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mediaType || "audio/mpeg" });
  return URL.createObjectURL(blob);
};

type ChatEntry = { role: "user" | "assistant"; content: string };

export function MinimalVoiceAgent() {
  const [agentState, setAgentState] = useState<AgentState>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const [lastAssistantText, setLastAssistantText] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastAudioUrlRef = useRef<string | null>(null);
  const historyRef = useRef<ChatEntry[]>([]);

  /* ── helpers ─────────────────────────────────────────────── */

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (lastAudioUrlRef.current) {
      URL.revokeObjectURL(lastAudioUrlRef.current);
      lastAudioUrlRef.current = null;
    }
  }, []);

  const ensureMic = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    streamRef.current = s;
    return s;
  }, []);

  /* ── send turn to API ───────────────────────────────────── */

  const sendTurn = useCallback(
    async (audioBlob: Blob) => {
      const mime = audioBlob.type || "audio/webm";
      const fd = new FormData();
      fd.append("audio", audioBlob, `utterance.${mime.includes("mp4") ? "mp4" : "webm"}`);
      fd.append("messages", JSON.stringify(historyRef.current.slice(-12)));

      const res = await fetch("/api/voice-agent/turn", { method: "POST", body: fd });
      const payload = (await res.json().catch(() => null)) as TurnResponse | null;
      if (!res.ok) throw new Error(payload?.error ?? `Voice agent error (${res.status})`);
      if (!payload) throw new Error("Empty response from voice agent.");
      return payload;
    },
    [],
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

        if (uText) {
          historyRef.current.push({ role: "user", content: uText });
        }
        if (aText) {
          historyRef.current.push({ role: "assistant", content: aText });
        }

        if (payload.audio?.base64) {
          stopAudio();
          const url = base64ToObjectUrl(payload.audio.base64, payload.audio.mediaType);
          lastAudioUrlRef.current = url;
          if (audioRef.current) {
            audioRef.current.src = url;
            setAgentState("talking");
            try {
              await audioRef.current.play();
            } catch {
              setAgentState(null);
            }
          } else {
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
    [sendTurn, stopAudio],
  );

  /* ── start / stop recording ─────────────────────────────── */

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === "recording") return;

    if (agentState === "talking") stopAudio();

    try {
      const s = await ensureMic();
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      });
      recorder.addEventListener("stop", () => void handleRecordingStop(recorder.mimeType));

      recorder.start();
      setAgentState("listening");
      setLastUserText(null);
      setLastAssistantText(null);
    } catch (err) {
      console.error("Mic error:", err);
      setAgentState(null);
    }
  }, [agentState, ensureMic, handleRecordingStop, stopAudio]);

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
    setAgentState(null);
  }, []);

  /* ── cleanup on unmount ─────────────────────────────────── */

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (lastAudioUrlRef.current) {
        URL.revokeObjectURL(lastAudioUrlRef.current);
      }
    };
  }, []);

  /* ── derived ────────────────────────────────────────────── */

  const isActive = agentState !== null; // listening, talking, or thinking

  /* ── render ─────────────────────────────────────────────── */

  return (
    <>
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

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
          bottom: isActive ? "50%" : "20px",
          left: isActive ? "50%" : "60px",
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
                colors={["#CADCFC", "#A0B9D1"]}
                seed={42}
                agentState={agentState}
              />
            </div>
          </div>
        </button>

        <span
          className={`text-[9px] tracking-widest uppercase select-none transition-all duration-300 ${
            isActive ? "text-white/70" : "text-muted-foreground/50"
          }`}
        >
          {agentState === "listening"
            ? "listening · tap to send"
            : agentState === "talking"
              ? "speaking · tap to stop"
              : agentState === "thinking"
                ? "thinking…"
                : "agent"}
        </span>

        {/* Transcription below orb */}
        {isActive && (lastUserText || lastAssistantText) && (
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
          </div>
        )}
      </div>
    </>
  );
}
