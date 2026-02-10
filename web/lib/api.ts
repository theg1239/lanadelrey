import type { Insights, JsonRenderSpec, TranscriptionResult } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const DEFAULT_CONFIDENCE = 0.9;

type FastApiTranscriptEntry = {
    transcript?: string;
    transcript_english?: string;
    start_time_seconds?: number;
    end_time_seconds?: number;
    confidence?: number;
    speaker_id?: string | number;
};

type FastApiResponse = {
    request_id?: string;
    recording_id?: string;
    language?: string;
    language_code?: string;
    duration_s?: number;
    transcript?: string;
    transcript_english?: string;
    diarized_transcript?: { entries?: FastApiTranscriptEntry[] };
    timestamps?: {
        words?: string[];
        words_english?: string[];
        start_time_seconds?: number[];
        end_time_seconds?: number[];
    };
    segments?: Array<{
        start_ms: number;
        end_ms: number;
        text: string;
        confidence?: number;
    }>;
    insights?: Insights;
    ui_spec?: JsonRenderSpec;
};

const sanitizeText = (value: unknown): string => {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim();
};

const isMeaningful = (text: string): boolean => {
    if (!text) return false;
    const lowered = text.toLowerCase();
    return lowered !== "<nospeech>" && lowered !== "nospeech";
};

const buildSegmentsFromEntries = (entries?: FastApiTranscriptEntry[]) => {
    if (!Array.isArray(entries)) return [];
    return entries
        .map((entry) => {
            const text = sanitizeText(entry.transcript_english ?? entry.transcript ?? "");
            if (!isMeaningful(text)) return null;
            const start = typeof entry.start_time_seconds === "number" ? entry.start_time_seconds : 0;
            const end = typeof entry.end_time_seconds === "number" ? entry.end_time_seconds : start;
            return {
                start_ms: Math.round(start * 1000),
                end_ms: Math.round(end * 1000),
                text,
                confidence: typeof entry.confidence === "number" ? entry.confidence : DEFAULT_CONFIDENCE,
                speaker: entry.speaker_id != null ? String(entry.speaker_id) : undefined,
            };
        })
        .filter((seg): seg is NonNullable<typeof seg> => Boolean(seg));
};

const buildSegmentsFromTimestamps = (timestamps?: FastApiResponse["timestamps"]) => {
    if (!timestamps) return [];
    const wordsEnglish = Array.isArray(timestamps.words_english) ? timestamps.words_english : [];
    const words = wordsEnglish.length > 0 ? wordsEnglish : Array.isArray(timestamps.words) ? timestamps.words : [];
    const starts = Array.isArray(timestamps.start_time_seconds)
        ? timestamps.start_time_seconds
        : [];
    const ends = Array.isArray(timestamps.end_time_seconds)
        ? timestamps.end_time_seconds
        : [];

    const segments = [] as TranscriptionResult["segments"];
    for (let i = 0; i < words.length; i += 1) {
        const text = sanitizeText(words[i]);
        if (!isMeaningful(text)) continue;
        const start = typeof starts[i] === "number" ? starts[i] : 0;
        const end = typeof ends[i] === "number" ? ends[i] : start;
        segments.push({
            start_ms: Math.round(start * 1000),
            end_ms: Math.round(end * 1000),
            text,
            confidence: DEFAULT_CONFIDENCE,
        });
    }

    return segments;
};

const emptyInsights = (): Insights => ({
    summary: "",
    primary_intent: "",
    intent_confidence: 0,
    secondary_intents: [],
    entities: [],
    obligations: [],
    regulatory_flags: [],
    risk_level: "low",
    sentiment: "neutral",
    emotions: [],
    pii_detected: false,
    action_items: [],
    ingestion: {
        detected_language: "unknown",
        language_confidence: 0,
        noise_level: "unknown",
        call_quality_score: 0,
        speaker_diarization: {
            speaker_count: 0,
            speaker_labels: [],
        },
        tamper_replay_risk: "unknown",
        ingest_flags: [],
    },
    transcription: {
        asr_summary: "",
        transcript_language: "unknown",
        multilingual_switching: false,
        asr_confidence: 0,
        domain_terms: [],
        profanity_terms: [],
        pii_items: [],
    },
    understanding: {
        financial_entity_layer_count: 0,
        obligation_count: 0,
        emotion_stress_markers: [],
        regulatory_phrase_count: 0,
    },
    review: {
        needs_human_review: false,
        review_reasons: [],
        correction_queue: [],
    },
});

const normalizeFastApiResponse = (data: FastApiResponse): TranscriptionResult => {
    if (Array.isArray(data.segments) && data.segments.length > 0) {
        return {
            recording_id: String(data.recording_id ?? data.request_id ?? `rec_${Date.now()}`),
            language: String(data.language ?? data.language_code ?? "unknown"),
            duration_s:
                typeof data.duration_s === "number"
                    ? data.duration_s
                    : Math.max(...data.segments.map((seg) => seg.end_ms), 0) / 1000,
            segments: data.segments.map((seg) => ({
                start_ms: seg.start_ms,
                end_ms: seg.end_ms,
                text: sanitizeText(seg.text),
                confidence:
                    typeof seg.confidence === "number" ? seg.confidence : DEFAULT_CONFIDENCE,
            })),
            insights: data.insights ?? emptyInsights(),
            ui_spec: data.ui_spec,
        };
    }

    const diarizedSegments = buildSegmentsFromEntries(data.diarized_transcript?.entries);
    const timestampSegments = buildSegmentsFromTimestamps(data.timestamps);
    const hasEnglishTimestamps = Array.isArray(data.timestamps?.words_english)
        && data.timestamps?.words_english?.some((word) => isMeaningful(sanitizeText(word)));
    const translatedTranscript = sanitizeText(data.transcript_english ?? "");
    const originalTranscript = sanitizeText(data.transcript ?? "");
    const hasTranslatedTranscript = Boolean(translatedTranscript && translatedTranscript !== originalTranscript);
    const transcriptFallback = sanitizeText(data.transcript_english ?? data.transcript ?? "");

    const preferredSegments = hasEnglishTimestamps
        ? timestampSegments
        : hasTranslatedTranscript
            ? []
            : diarizedSegments.length
                ? diarizedSegments
                : timestampSegments;

    const segments = preferredSegments.length
        ? preferredSegments
        : transcriptFallback
            ? [
                {
                    start_ms: 0,
                    end_ms: 0,
                    text: transcriptFallback,
                    confidence: DEFAULT_CONFIDENCE,
                },
            ]
            : [];

    const maxEndMs = segments.reduce((max, seg) => Math.max(max, seg.end_ms), 0);
    const duration_s =
        typeof data.duration_s === "number"
            ? data.duration_s
            : maxEndMs / 1000;

    return {
        recording_id: String(data.request_id ?? data.recording_id ?? `rec_${Date.now()}`),
        language: String(data.language_code ?? data.language ?? "unknown"),
        duration_s,
        segments,
        insights: data.insights ?? emptyInsights(),
        ui_spec: data.ui_spec,
    };
};

export async function transcribeAudio(
    file: File,
    onProgress?: (status: string) => void
): Promise<TranscriptionResult> {
    onProgress?.("uploading");
    const formData = new FormData();
    formData.append("audio", file);
    const res = await fetch(`${API_BASE}/audio/update`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        let err = "";
        if (contentType.includes("application/json")) {
            const payload = await res.json().catch(() => null);
            if (payload && typeof payload === "object") {
                err = (payload as { detail?: string; error?: string }).detail
                    ?? (payload as { error?: string }).error
                    ?? JSON.stringify(payload);
            }
        } else {
            err = await res.text();
        }
        throw new Error(err || `Transcription failed (${res.status})`);
    }
    onProgress?.("done");
    const payload = (await res.json()) as FastApiResponse;
    return normalizeFastApiResponse(payload);
}
