"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./minimal-orb.module.css";

export type MinimalOrbProps = {
  stream: MediaStream | null;
  isListening?: boolean;
  isSpeaking?: boolean;
  className?: string;
};

export function MinimalOrb({
  stream,
  isListening = false,
  isSpeaking = false,
  className,
}: MinimalOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const [intensity, setIntensity] = useState(0);

  // Setup audio analysis
  useEffect(() => {
    if (!stream) {
      analyserRef.current = null;
      dataArrayRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => {});
    }

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray: Uint8Array<ArrayBuffer> = new Uint8Array(bufferLength);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    return () => {
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      try {
        analyser.disconnect();
      } catch {
        // ignore
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      void audioContext.close().catch(() => {});
      if (audioContextRef.current === audioContext) {
        audioContextRef.current = null;
      }
    };
  }, [stream]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      rafRef.current = window.requestAnimationFrame(tick);

      const w = canvas.width;
      const h = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Get audio data
      let audioIntensity = 0;
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      if (analyser && dataArray && (isListening || isSpeaking)) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          sum += dataArray[i] ?? 0;
        }
        const average = sum / dataArray.length;
        audioIntensity = average < 5 ? 0 : Math.min(average / 255, 1);
        setIntensity(audioIntensity);
      } else {
        setIntensity(0);
      }

      // Draw simple circle with glow based on audio
      const centerX = w / 2;
      const centerY = h / 2;
      const baseRadius = 20;
      const expandedRadius =
        baseRadius +
        audioIntensity * 8 +
        (isSpeaking ? 4 : 0) +
        (isListening ? 2 : 0);

      // Outer glow
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        expandedRadius - 5,
        centerX,
        centerY,
        expandedRadius + 10
      );
      const glowColor = isSpeaking ? "#ff3e1c" : isListening ? "#1c8cff" : "#fff";
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(0.5, glowColor.replace(")", ", 0.3)"));
      gradient.addColorStop(1, glowColor.replace(")", ", 0)"));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        expandedRadius + 10,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Main circle
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, expandedRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner lighter core
      ctx.fillStyle = "white";
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, expandedRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    tick();
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
    };
  }, [isListening, isSpeaking]);

  return (
    <div className={cn(styles.container, className)}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
