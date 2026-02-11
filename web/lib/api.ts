import type {
    Insights,
    JsonRenderSpec,
    LibraryAudioItem,
    TranscriptionResult,
} from "./types";

type FastApiTranscriptEntry = {
    transcript?: string;
    transcript_english?: string;
    start_time_seconds?: number;
    end_time_seconds?: number;
    confidence?: number;
    speaker_id?: string | number;
};

type FastApiTranscriptData = {
    request_id?: string;
    recording_id?: string;
    language?: string;
    language_code?: string;
    language_probability?: number;
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
        translated_text?: string;
        original_text?: string;
    }>;
};

type FastApiResponse = FastApiTranscriptData & {
    insights?: Insights;
    ui_spec?: JsonRenderSpec;
    // Backend wraps transcript data inside translate_output
    translate_output?: FastApiTranscriptData;
    intent_output?: Record<string, unknown> | null;
};

type LibraryAudioResponse = {
    items?: LibraryAudioItem[];
};

const normalizeConfidence = (value: unknown): number | undefined => {
    if (typeof value !== "number" || Number.isNaN(value)) return undefined;
    if (value >= 0 && value <= 1) return value;
    if (value > 1 && value <= 100) return value / 100;
    return undefined;
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

const buildSegmentsFromEntries = (
    entries?: FastApiTranscriptEntry[],
    fallbackConfidence?: number
) => {
    if (!Array.isArray(entries)) return [];
    return entries
        .map((entry) => {
            const translatedText = sanitizeText(entry.transcript_english ?? "");
            const originalText = sanitizeText(entry.transcript ?? "");
            const primaryText = isMeaningful(translatedText) ? translatedText : originalText;
            if (!isMeaningful(primaryText)) return null;
            const start = typeof entry.start_time_seconds === "number" ? entry.start_time_seconds : 0;
            const end = typeof entry.end_time_seconds === "number" ? entry.end_time_seconds : start;
            return {
                start_ms: Math.round(start * 1000),
                end_ms: Math.round(end * 1000),
                text: primaryText,
                translated_text: isMeaningful(translatedText) ? translatedText : undefined,
                original_text:
                    isMeaningful(originalText) && originalText !== primaryText
                        ? originalText
                        : undefined,
                confidence: normalizeConfidence(entry.confidence) ?? fallbackConfidence,
                speaker: entry.speaker_id != null ? String(entry.speaker_id) : undefined,
            };
        })
        .filter((seg): seg is NonNullable<typeof seg> => Boolean(seg));
};

const buildSegmentsFromTimestamps = (
    timestamps?: FastApiResponse["timestamps"],
    fallbackConfidence?: number
) => {
    if (!timestamps) return [];
    const wordsEnglish = Array.isArray(timestamps.words_english) ? timestamps.words_english : [];
    const wordsOriginal = Array.isArray(timestamps.words) ? timestamps.words : [];
    const starts = Array.isArray(timestamps.start_time_seconds)
        ? timestamps.start_time_seconds
        : [];
    const ends = Array.isArray(timestamps.end_time_seconds)
        ? timestamps.end_time_seconds
        : [];

    const segments = [] as TranscriptionResult["segments"];
    const totalWords = Math.max(wordsEnglish.length, wordsOriginal.length);
    for (let i = 0; i < totalWords; i += 1) {
        const translatedText = sanitizeText(wordsEnglish[i] ?? "");
        const originalText = sanitizeText(wordsOriginal[i] ?? "");
        const primaryText = isMeaningful(translatedText) ? translatedText : originalText;
        if (!isMeaningful(primaryText)) continue;
        const start = typeof starts[i] === "number" ? starts[i] : 0;
        const end = typeof ends[i] === "number" ? ends[i] : start;
        segments.push({
            start_ms: Math.round(start * 1000),
            end_ms: Math.round(end * 1000),
            text: primaryText,
            translated_text: isMeaningful(translatedText) ? translatedText : undefined,
            original_text:
                isMeaningful(originalText) && originalText !== primaryText
                    ? originalText
                    : undefined,
            confidence: fallbackConfidence,
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

const normalizeInsightsForDisplay = (
    rawInsights: Insights,
    context: {
        language?: unknown;
        transcript?: unknown;
        segments?: unknown;
        diarizedEntries?: unknown;
        timestamps?: unknown;
    }
): Insights => {
    const insights = structuredClone(rawInsights);
    const normalizedLanguage = sanitizeText(context.language);
    const hasLanguage = Boolean(normalizedLanguage && normalizedLanguage.toLowerCase() !== "unknown");
    const hasTranscript = isMeaningful(sanitizeText(context.transcript));
    const hasSegments = Array.isArray(context.segments) && context.segments.length > 0;
    const hasDiarized = Array.isArray(context.diarizedEntries) && context.diarizedEntries.length > 0;
    const ts = (context.timestamps && typeof context.timestamps === "object")
        ? (context.timestamps as {
            words?: unknown;
            words_english?: unknown;
            start_time_seconds?: unknown;
            end_time_seconds?: unknown;
        })
        : undefined;
    const hasTimestamps = Boolean(
        (Array.isArray(ts?.words) && ts.words.some((w) => isMeaningful(sanitizeText(w))))
        || (Array.isArray(ts?.words_english) && ts.words_english.some((w) => isMeaningful(sanitizeText(w))))
        || (Array.isArray(ts?.start_time_seconds) && ts.start_time_seconds.some((n) => typeof n === "number"))
        || (Array.isArray(ts?.end_time_seconds) && ts.end_time_seconds.some((n) => typeof n === "number"))
    );

    if (hasLanguage) {
        if (!insights.ingestion.detected_language || insights.ingestion.detected_language.toLowerCase() === "unknown") {
            insights.ingestion.detected_language = normalizedLanguage;
        }
        if (!insights.transcription.transcript_language || insights.transcription.transcript_language.toLowerCase() === "unknown") {
            insights.transcription.transcript_language = normalizedLanguage;
        }
        if ((insights.ingestion.language_confidence ?? 0) <= 0) {
            insights.ingestion.language_confidence = 1;
        }
    }

    const reviewReasons = Array.isArray(insights.review.review_reasons)
        ? insights.review.review_reasons
        : [];
    const filtered = reviewReasons.filter((reason) => {
        const lower = sanitizeText(reason).toLowerCase();
        if (
            (hasTranscript || hasTimestamps || hasSegments || hasDiarized)
            && (
                lower.includes("no audio/timestamp")
                || lower.includes("no timestamp")
                || lower.includes("no diarized segment")
                || lower.includes("inferred from transcript text only")
                || lower.includes("asr confidence and language detection inferred from transcript")
            )
        ) {
            return false;
        }
        if (
            hasLanguage
            && (
                lower.includes("language field in original input was")
                || lower.includes("automated detection from text")
                || (lower.includes("language") && lower.includes("unknown"))
            )
        ) {
            return false;
        }
        return true;
    });

    insights.review.review_reasons = filtered;
    if (filtered.length === 0 && (insights.review.correction_queue?.length ?? 0) === 0) {
        insights.review.needs_human_review = false;
    }

    return insights;
};

const normalizeFastApiResponse = (raw: FastApiResponse): TranscriptionResult => {
    // Backend wraps transcript data inside translate_output — flatten it
    const translate = raw.translate_output;
    const data: FastApiResponse = translate
        ? { ...translate, insights: raw.insights, ui_spec: raw.ui_spec }
        : raw;
    const normalizedInsights = normalizeInsightsForDisplay(
        data.insights ?? emptyInsights(),
        {
            language: data.language ?? data.language_code,
            transcript: data.transcript_english ?? data.transcript,
            segments: data.segments,
            diarizedEntries: data.diarized_transcript?.entries,
            timestamps: data.timestamps,
        }
    );

    const globalConfidence =
        normalizeConfidence(data.insights?.transcription?.asr_confidence)
        ?? normalizeConfidence(data.language_probability);

    if (Array.isArray(data.segments) && data.segments.length > 0) {
        return {
            recording_id: String(data.recording_id ?? data.request_id ?? `rec_${Date.now()}`),
            language: String(data.language ?? data.language_code ?? "unknown"),
            duration_s:
                typeof data.duration_s === "number"
                    ? data.duration_s
                    : Math.max(...data.segments.map((seg) => seg.end_ms), 0) / 1000,
            segments: data.segments.map((seg) => {
                const translatedText = sanitizeText(seg.translated_text ?? "");
                const originalText = sanitizeText(seg.original_text ?? "");
                const rawText = sanitizeText(seg.text);
                const primaryText = isMeaningful(translatedText)
                    ? translatedText
                    : (isMeaningful(rawText) ? rawText : originalText);
                return {
                    start_ms: seg.start_ms,
                    end_ms: seg.end_ms,
                    text: primaryText,
                    translated_text: isMeaningful(translatedText) ? translatedText : undefined,
                    original_text:
                        isMeaningful(originalText) && originalText !== primaryText
                            ? originalText
                            : undefined,
                    confidence: normalizeConfidence(seg.confidence) ?? globalConfidence,
                };
            }),
            insights: normalizedInsights,
            ui_spec: data.ui_spec,
        };
    }

    const diarizedSegments = buildSegmentsFromEntries(
        data.diarized_transcript?.entries,
        globalConfidence
    );
    const timestampSegments = buildSegmentsFromTimestamps(
        data.timestamps,
        globalConfidence
    );
    const hasEnglishTimestamps = Array.isArray(data.timestamps?.words_english)
        && data.timestamps?.words_english?.some((word) => isMeaningful(sanitizeText(word)));
    const translatedTranscript = sanitizeText(data.transcript_english ?? "");
    const originalTranscript = sanitizeText(data.transcript ?? "");
    const hasTranslatedTranscript = Boolean(translatedTranscript && translatedTranscript !== originalTranscript);
    const transcriptFallback = sanitizeText(data.transcript_english ?? data.transcript ?? "");

    const preferredSegments = diarizedSegments.length
        ? diarizedSegments
        : hasEnglishTimestamps
            ? timestampSegments
            : timestampSegments.length
                ? timestampSegments
                : [];

    const segments = preferredSegments.length
        ? preferredSegments
        : transcriptFallback
            ? [
                {
                    start_ms: 0,
                    end_ms: 0,
                    text: transcriptFallback,
                    translated_text: isMeaningful(translatedTranscript) ? translatedTranscript : undefined,
                    original_text:
                        isMeaningful(originalTranscript) && originalTranscript !== transcriptFallback
                            ? originalTranscript
                            : undefined,
                    confidence: globalConfidence,
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
        insights: normalizedInsights,
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

    // Simulate staged progress since the backend is a single request
    const progressTimer = setTimeout(() => onProgress?.("transcribing"), 800);
    const analyzeTimer = setTimeout(() => onProgress?.("analyzing"), 4000);
    const finalizeTimer = setTimeout(() => onProgress?.("finalizing"), 8000);

    try {
        const res = await fetch("/api/audio/update", {
            method: "POST",
            body: formData,
        });

        clearTimeout(progressTimer);
        clearTimeout(analyzeTimer);
        clearTimeout(finalizeTimer);

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
    } catch (error) {
        clearTimeout(progressTimer);
        clearTimeout(analyzeTimer);
        clearTimeout(finalizeTimer);
        throw error;
    }
}

export async function listLibraryAudio(): Promise<LibraryAudioItem[]> {
    const res = await fetch("/api/library-audio", {
        method: "GET",
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`Failed to load library audio (${res.status})`);
    }
    const payload = (await res.json()) as LibraryAudioResponse;
    return Array.isArray(payload.items) ? payload.items : [];
}

export async function fetchPublicAudioFile(item: Pick<LibraryAudioItem, "url" | "name">): Promise<File> {
    const res = await fetch(item.url, {
        method: "GET",
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`Failed to load ${item.name} (${res.status})`);
    }
    const blob = await res.blob();
    return new File([blob], item.name, {
        type: blob.type || "audio/m4a",
    });
}
