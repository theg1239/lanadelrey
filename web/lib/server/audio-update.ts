import { openai } from "@ai-sdk/openai";
import {
  experimental_transcribe as transcribe,
  generateText,
  jsonSchema,
  Output,
} from "ai";
import { z } from "zod";

import insightsSchema from "@/lib/server/insights-schema.json";

type JsonRecord = Record<string, unknown>;

type TranscriptSegment = {
  text: string;
  startSecond: number;
  endSecond: number;
};

const PYTHON_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TRANSLATION_MODEL = process.env.OPENAI_TRANSLATION_MODEL ?? "gpt-5.2";
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-transcribe";
const INSIGHTS_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const translationOutputSchema = z.object({
  transcript_english: z.string(),
  detected_source_language: z.string(),
  words_english: z.array(z.string()),
  entries_english: z.array(z.string()),
});

const isOpenAiPipelineEnabled = () =>
  typeof process.env.OPENAI === "string"
  && process.env.OPENAI.toLowerCase() === "true";

const asRecord = (value: unknown): JsonRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
};

const sanitizeText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
};

const isUnknownLanguage = (value: unknown): boolean => {
  const lang = sanitizeText(value).toLowerCase();
  return !lang || lang === "unknown" || lang === "und" || lang === "n/a";
};

const normalizeListLength = (
  values: string[],
  targetLength: number,
  fallbackValues: string[]
): string[] => {
  if (targetLength <= 0) return [];

  const out: string[] = [];
  for (let i = 0; i < targetLength; i += 1) {
    const fromModel = sanitizeText(values[i] ?? "");
    const fallback = sanitizeText(fallbackValues[i] ?? "");
    out.push(fromModel || fallback);
  }
  return out;
};

const buildOpenAiTranscriptionPayload = (args: {
  transcription: {
    text: string;
    language?: string;
    durationInSeconds?: number;
    segments: TranscriptSegment[];
  };
  fileName: string;
}): JsonRecord => {
  const { transcription, fileName } = args;
  const requestId = `openai_${crypto.randomUUID()}`;
  const asrLanguage = sanitizeText(transcription.language);
  const resolvedLanguage = asrLanguage || "unknown";
  const originalSegments = Array.isArray(transcription.segments)
    ? transcription.segments
    : [];
  const transcriptText = sanitizeText(transcription.text);

  const durationFromSegments = originalSegments.reduce(
    (max, seg) => Math.max(max, seg.endSecond ?? 0),
    0
  );

  const duration =
    typeof transcription.durationInSeconds === "number"
      ? transcription.durationInSeconds
      : durationFromSegments;

  const segments = originalSegments.length > 0
    ? originalSegments
    : (transcriptText
      ? [{
          text: transcriptText,
          startSecond: 0,
          endSecond: duration > 0 ? duration : 0,
        } satisfies TranscriptSegment]
      : []);

  const words = segments.map((seg) => sanitizeText(seg.text));
  const startTimes = segments.map((seg) =>
    typeof seg.startSecond === "number" ? seg.startSecond : 0
  );
  const endTimes = segments.map((seg) =>
    typeof seg.endSecond === "number" ? seg.endSecond : seg.startSecond ?? 0
  );

  return {
    request_id: requestId,
    recording_id: requestId,
    source_file: fileName,
    language: resolvedLanguage,
    language_code: resolvedLanguage,
    language_probability: asrLanguage ? 1 : 0,
    duration_s: duration,
    transcript: transcriptText,
    timestamps: {
      words,
      start_time_seconds: startTimes,
      end_time_seconds: endTimes,
    },
    diarized_transcript: {
      entries: segments.map((seg, idx) => ({
        speaker_id: "spk_1",
        segment_id: idx,
        transcript: sanitizeText(seg.text),
        start_time_seconds:
          typeof seg.startSecond === "number" ? seg.startSecond : 0,
        end_time_seconds:
          typeof seg.endSecond === "number"
            ? seg.endSecond
            : seg.startSecond ?? 0,
      })),
    },
  };
};

const translateTranscription = async (
  payload: JsonRecord
): Promise<JsonRecord> => {
  const timestamps = asRecord(payload.timestamps);
  const diarized = asRecord(payload.diarized_transcript);
  const entriesRaw = Array.isArray(diarized?.entries) ? diarized.entries : [];

  const words = Array.isArray(timestamps?.words)
    ? timestamps.words.map((w) => sanitizeText(w))
    : [];
  const entries = entriesRaw
    .map((entry) => asRecord(entry))
    .filter((entry): entry is JsonRecord => Boolean(entry));
  const entryTexts = entries.map((entry) => sanitizeText(entry.transcript));

  const transcript = sanitizeText(payload.transcript);
  const languageCode = sanitizeText(payload.language_code || payload.language || "unknown");

  const { output } = await generateText({
    model: openai(TRANSLATION_MODEL),
    temperature: 0,
    output: Output.object({
      schema: translationOutputSchema,
      name: "translation_output",
    }),
    system:
      "You are a deterministic translation engine. Translate source text to English (en-IN). "
      + "Preserve meaning, financial details, numbers, and named entities. "
      + "Also detect source language code using BCP-47 style (e.g. en-IN, hi-IN, ta-IN, kn-IN). "
      + "Do not add commentary.",
    prompt:
      "Translate the provided transcript payload to English. "
      + "Return every field in the schema.\n\n"
      + `Source language: ${languageCode}\n`
      + `Target language: en-IN\n`
      + "If text is empty, keep it empty. If text is '<nospeech>', keep '<nospeech>'.\n\n"
      + "For detected_source_language: return the best language code; "
      + "only return 'unknown' if transcript/words/entries are all empty.\n\n"
      + `INPUT_JSON:\n${JSON.stringify({
        transcript,
        words,
        entries: entryTexts,
      })}`,
  });

  const translated = structuredClone(payload);
  translated.transcript_english = sanitizeText(output.transcript_english) || transcript;

  if (isUnknownLanguage(translated.language_code) || isUnknownLanguage(translated.language)) {
    const detectedSourceLanguage = sanitizeText(output.detected_source_language);
    if (!isUnknownLanguage(detectedSourceLanguage)) {
      translated.language_code = detectedSourceLanguage;
      translated.language = detectedSourceLanguage;
    }
  }

  const translatedTimestamps = asRecord(translated.timestamps);
  if (translatedTimestamps) {
    translatedTimestamps.words_english = normalizeListLength(
      output.words_english,
      words.length,
      words
    );
  }

  const translatedDiarized = asRecord(translated.diarized_transcript);
  if (translatedDiarized && Array.isArray(translatedDiarized.entries)) {
    const translatedEntryTexts = normalizeListLength(
      output.entries_english,
      entries.length,
      entryTexts
    );

    translatedDiarized.entries = translatedDiarized.entries.map((entry, idx) => {
      const obj = asRecord(entry);
      if (!obj) return entry;
      return {
        ...obj,
        transcript_english: translatedEntryTexts[idx],
      };
    });
  }

  return translated;
};

const buildInsightsInput = (payload: JsonRecord): JsonRecord => {
  const diarized = asRecord(payload.diarized_transcript);
  const entries = Array.isArray(diarized?.entries) ? diarized.entries : [];
  const timestamps = asRecord(payload.timestamps);

  const segments = entries
    .map((entry) => asRecord(entry))
    .filter((entry): entry is JsonRecord => Boolean(entry))
    .map((entry) => ({
      speaker: entry.speaker_id,
      start_s: entry.start_time_seconds,
      end_s: entry.end_time_seconds,
      text:
        sanitizeText(entry.transcript_english)
        || sanitizeText(entry.transcript)
        || "",
    }));

  return {
    language: payload.language_code || payload.language || "unknown",
    transcript:
      sanitizeText(payload.transcript_english)
      || sanitizeText(payload.transcript)
      || "",
    segments,
    timestamps: {
      words: Array.isArray(timestamps?.words) ? timestamps?.words : null,
      words_english: Array.isArray(timestamps?.words_english)
        ? timestamps?.words_english
        : null,
      start_time_seconds: Array.isArray(timestamps?.start_time_seconds)
        ? timestamps?.start_time_seconds
        : null,
      end_time_seconds: Array.isArray(timestamps?.end_time_seconds)
        ? timestamps?.end_time_seconds
        : null,
    },
  };
};

const hasNonEmptyArray = (
  value: unknown,
  itemCheck?: (item: unknown) => boolean
): boolean => {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!itemCheck) return true;
  return value.some((item) => itemCheck(item));
};

const normalizeGeneratedInsights = (
  insightsRaw: JsonRecord,
  inputPayload: JsonRecord
): JsonRecord => {
  const insights = structuredClone(insightsRaw);
  const ingestion = asRecord(insights.ingestion);
  const transcription = asRecord(insights.transcription);
  const review = asRecord(insights.review);

  const language = sanitizeText(inputPayload.language);
  const hasLanguage = !isUnknownLanguage(language);
  const segments = Array.isArray(inputPayload.segments) ? inputPayload.segments : [];
  const hasSegmentData = segments.some((seg) => {
    const row = asRecord(seg);
    return Boolean(sanitizeText(row?.text));
  });
  const timestamps = asRecord(inputPayload.timestamps);
  const hasTimestampData =
    hasNonEmptyArray(timestamps?.start_time_seconds, (v) => typeof v === "number")
    || hasNonEmptyArray(timestamps?.end_time_seconds, (v) => typeof v === "number")
    || hasNonEmptyArray(timestamps?.words, (v) => Boolean(sanitizeText(v)))
    || hasNonEmptyArray(timestamps?.words_english, (v) => Boolean(sanitizeText(v)));
  const hasTranscript = Boolean(sanitizeText(inputPayload.transcript));

  if (ingestion && hasLanguage) {
    if (isUnknownLanguage(ingestion.detected_language)) {
      ingestion.detected_language = language;
    }
    if (typeof ingestion.language_confidence !== "number" || ingestion.language_confidence <= 0) {
      ingestion.language_confidence = 1;
    }
  }

  if (transcription && hasLanguage && isUnknownLanguage(transcription.transcript_language)) {
    transcription.transcript_language = language;
  }

  if (review) {
    const reasons = Array.isArray(review.review_reasons)
      ? review.review_reasons.map((r) => sanitizeText(r)).filter(Boolean)
      : [];

    const filteredReasons = reasons.filter((reason) => {
      const lower = reason.toLowerCase();
      if (
        (hasTimestampData || hasSegmentData || hasTranscript) &&
        (
          lower.includes("no audio/timestamp")
          || lower.includes("no timestamp")
          || lower.includes("no diarized segment")
          || lower.includes("asr confidence and language detection inferred from transcript")
          || lower.includes("inferred from transcript text only")
        )
      ) {
        return false;
      }
      if (
        hasLanguage &&
        (
          lower.includes("language field in original input was")
          || lower.includes("automated detection from text")
          || (lower.includes("language") && lower.includes("unknown"))
        )
      ) {
        return false;
      }
      return true;
    });

    review.review_reasons = filteredReasons;
    const correctionQueue = Array.isArray(review.correction_queue) ? review.correction_queue : [];
    if (filteredReasons.length === 0 && correctionQueue.length === 0) {
      review.needs_human_review = false;
    }
  }

  return insights;
};

const generateInsights = async (payload: JsonRecord) => {
  const inputPayload = buildInsightsInput(payload);

  const { output } = await generateText({
    model: openai(INSIGHTS_MODEL),
    temperature: 0.2,
    output: Output.object({
      schema: jsonSchema(insightsSchema),
      name: "insights",
    }),
    system:
      "You are an audio intelligence analyst for Challenge 1: Universal Financial Audio "
      + "Intelligence Engine. Use ONLY the provided transcript, timestamps, and diarized segments. "
      + "Produce structured output that covers ingestion, transcription, financial speech understanding, "
      + "and review/correction. If evidence is missing, output conservative values and add a review reason. "
      + "If timestamps/segments/diarized entries are present, do not claim they are missing. "
      + "If language is provided, do not claim language is unknown. "
      + "Do not emit generic boilerplate review reasons that contradict the provided INPUT fields. "
      + "Do not invent facts. Return JSON matching the schema exactly.",
    prompt:
      "Analyze this call for Problem 1 only. Include: "
      + "noise/language/diarization/tamper-risk signals, ASR quality and multilingual switching, "
      + "intent/entities/obligations/emotion-regulatory markers, and review/correction guidance. "
      + "Return structured insights and a JSON-Render UI spec using allowed components only. "
      + "Every UI node must include both props and children keys (use children: [] for leaves). "
      + "Ensure ui_spec is directly consistent with insights.\n\n"
      + `INPUT:\n${JSON.stringify(inputPayload)}`,
  });

  return output as {
    insights: JsonRecord;
    ui_spec: JsonRecord;
  };
};

const runOpenAiPipeline = async (args: {
  audioBytes: Uint8Array;
  fileName: string;
}): Promise<JsonRecord> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when OPENAI=true");
  }

  const transcription = await transcribe({
    model: openai.transcription(TRANSCRIPTION_MODEL),
    audio: args.audioBytes,
    providerOptions: {
      openai: {
        timestampGranularities: ["segment"],
      },
    },
  });

  const transcribedPayload = buildOpenAiTranscriptionPayload({
    transcription: {
      text: transcription.text,
      language: transcription.language,
      durationInSeconds: transcription.durationInSeconds,
      segments: transcription.segments,
    },
    fileName: args.fileName,
  });

  const translatedPayload = await translateTranscription(transcribedPayload);
  const insights = await generateInsights(translatedPayload);
  const insightsInput = buildInsightsInput(translatedPayload);
  const normalizedInsights = normalizeGeneratedInsights(
    asRecord(insights.insights) ?? {},
    insightsInput
  );

  return {
    ...translatedPayload,
    intent_output: null,
    insights: normalizedInsights,
    ui_spec: insights.ui_spec,
  };
};

const runPythonPipeline = async (args: {
  audioBytes: Uint8Array;
  fileName: string;
}): Promise<JsonRecord> => {
  const uploadBytes = new Uint8Array(args.audioBytes.byteLength);
  uploadBytes.set(args.audioBytes);

  const fd = new FormData();
  fd.append(
    "audio",
    new Blob([uploadBytes], { type: "application/octet-stream" }),
    args.fileName
  );

  const base = PYTHON_API_BASE.endsWith("/")
    ? PYTHON_API_BASE.slice(0, -1)
    : PYTHON_API_BASE;

  const res = await fetch(`${base}/audio/update`, {
    method: "POST",
    body: fd,
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    let message = `Python service failed (${res.status})`;

    if (contentType.includes("application/json")) {
      const body = (await res.json().catch(() => null)) as JsonRecord | null;
      if (body) {
        message =
          sanitizeText(body.detail)
          || sanitizeText(body.error)
          || message;
      }
    } else {
      message = sanitizeText(await res.text().catch(() => "")) || message;
    }

    throw new Error(message);
  }

  const body = (await res.json().catch(() => null)) as unknown;
  const payload = asRecord(body);
  if (!payload) {
    throw new Error("Python service returned an invalid JSON payload");
  }

  return payload;
};

export async function runAudioUpdatePipeline(args: {
  audioBytes: Uint8Array;
  fileName: string;
}): Promise<JsonRecord> {
  if (isOpenAiPipelineEnabled()) {
    return runOpenAiPipeline(args);
  }
  return runPythonPipeline(args);
}
