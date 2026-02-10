import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import {
  generateText,
  experimental_generateSpeech as generateSpeech,
  experimental_transcribe as transcribe,
  NoSpeechGeneratedError,
  NoTranscriptGeneratedError,
} from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CoreMessage = {
  role: "user" | "assistant";
  content: string;
};

const safeJsonParse = (value: unknown): unknown | null => {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeMessages = (value: unknown): CoreMessage[] => {
  if (!Array.isArray(value)) return [];
  const out: CoreMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && typeof content === "string") {
      const text = content.trim();
      if (text) out.push({ role, content: text });
    }
  }
  return out.slice(-24);
};

const buildSystemPrompt = (callState: unknown) => {
  const stateJson =
    callState && typeof callState === "object"
      ? JSON.stringify(callState)
      : "{}";

  return [
    "You are a real-time voice agent inside a call UI.",
    "You can see the conversation transcript (messages) and a call_state JSON blob.",
    "If the user asks about what is being recorded, what just happened, whether the mic is on, timing, or the flow of the call: answer from call_state and the transcript.",
    "If the information is not present, say you don't know. Do not invent audio you did not receive.",
    "Keep responses concise and speakable.",
    "",
    `call_state: ${stateJson}`,
  ].join("\n");
};

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let userText = "";
    let messages: CoreMessage[] = [];
    let callState: unknown = null;
    let voice: string | undefined;

    let transcriptionMeta:
      | {
          language?: string;
          durationInSeconds?: number;
          segments?: Array<{ text: string; startSecond: number; endSecond: number }>;
        }
      | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audio = formData.get("audio");
      const rawText = formData.get("text");
      const rawMessages = formData.get("messages");
      const rawCallState = formData.get("callState");
      const rawVoice = formData.get("voice");

      if (typeof rawText === "string") userText = rawText;
      if (typeof rawMessages === "string") {
        messages = normalizeMessages(safeJsonParse(rawMessages));
      }
      if (typeof rawCallState === "string") {
        callState = safeJsonParse(rawCallState);
      }
      if (typeof rawVoice === "string" && rawVoice.trim()) {
        voice = rawVoice.trim();
      }

      if (!userText && audio instanceof File) {
        const buffer = await audio.arrayBuffer();
        const transcript = await transcribe({
          model: openai.transcription("gpt-4o-mini-transcribe"),
          audio: new Uint8Array(buffer),
        });
        userText = transcript.text ?? "";
        transcriptionMeta = {
          language: transcript.language,
          durationInSeconds: transcript.durationInSeconds,
          segments: transcript.segments,
        };
      }
    } else {
      const body = (await request.json().catch(() => null)) as unknown;
      if (body && typeof body === "object") {
        const b = body as {
          text?: unknown;
          messages?: unknown;
          callState?: unknown;
          voice?: unknown;
        };
        if (typeof b.text === "string") userText = b.text;
        messages = normalizeMessages(b.messages);
        callState = b.callState ?? null;
        if (typeof b.voice === "string" && b.voice.trim()) voice = b.voice.trim();
      }
    }

    userText = userText.trim();
    if (!userText) {
      return NextResponse.json(
        { error: "No speech detected. Try again with a longer utterance." },
        { status: 400 },
      );
    }

    const system = buildSystemPrompt(callState);
    const { text: assistantText } = await generateText({
      model: openai("gpt-4o-mini"),
      system,
      messages: [...messages, { role: "user", content: userText }],
      temperature: 0.4,
    });

    const assistant = (assistantText ?? "").trim();
    const { audio, warnings } = await generateSpeech({
      model: openai.speech("tts-1-hd"),
      text: assistant || " ",
      voice: voice ?? "alloy",
      outputFormat: "mp3",
    });

    // Do not return audio.uint8Array in JSON (it would bloat responses dramatically).
    const audioPayload = {
      base64: audio.base64,
      mediaType: audio.mediaType,
      format: audio.format,
    };

    return NextResponse.json({
      userText,
      assistantText: assistant,
      audio: audioPayload,
      warnings,
      transcription: transcriptionMeta,
    });
  } catch (error) {
    if (NoTranscriptGeneratedError.isInstance(error)) {
      return NextResponse.json(
        { error: "No speech detected. Try again with a longer utterance." },
        { status: 400 },
      );
    }
    if (NoSpeechGeneratedError.isInstance(error)) {
      return NextResponse.json(
        { error: "Failed to generate speech audio for the response." },
        { status: 502 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
