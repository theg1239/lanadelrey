export interface Segment {
    start_ms: number;
    end_ms: number;
    text: string;
    confidence: number;
    speaker?: string;
    translated_text?: string | null;
    original_text?: string | null;
}
export interface Entity {
    type: string;
    value: string;
    currency?: string | null;
    confidence?: number | null;
}
export interface Obligation {
    text: string;
    speaker?: string | null;
    due_date?: string | null;
    confidence?: number | null;
}
export interface EmotionScore {
    label: string;
    score: number;
}
export interface IngestionSignals {
    detected_language: string;
    language_confidence: number;
    noise_level: "low" | "medium" | "high" | "unknown";
    call_quality_score: number;
    speaker_diarization: {
        speaker_count: number;
        speaker_labels: string[];
    };
    tamper_replay_risk: "low" | "medium" | "high" | "unknown";
    ingest_flags: string[];
}
export interface PiiDetectedItem {
    type: string;
    value: string;
    confidence: number;
}
export interface TranscriptionSignals {
    asr_summary: string;
    transcript_language: string;
    multilingual_switching: boolean;
    asr_confidence: number;
    domain_terms: string[];
    profanity_terms: string[];
    pii_items: PiiDetectedItem[];
}
export interface UnderstandingSignals {
    financial_entity_layer_count: number;
    obligation_count: number;
    emotion_stress_markers: string[];
    regulatory_phrase_count: number;
}
export interface ReviewQueueItem {
    field: string;
    current_value: string;
    suggested_value: string;
    rationale: string;
}
export interface ReviewSignals {
    needs_human_review: boolean;
    review_reasons: string[];
    correction_queue: ReviewQueueItem[];
}
export interface Insights {
    summary: string;
    primary_intent: string;
    intent_confidence: number;
    secondary_intents: string[];
    entities: Entity[];
    obligations: Obligation[];
    regulatory_flags: string[];
    risk_level: "low" | "medium" | "high";
    sentiment: "positive" | "neutral" | "negative" | "mixed";
    emotions: EmotionScore[];
    pii_detected: boolean;
    action_items: string[];
    ingestion: IngestionSignals;
    transcription: TranscriptionSignals;
    understanding: UnderstandingSignals;
    review: ReviewSignals;
}
export interface JsonRenderNode {
    type: string;
    props?: Record<string, unknown>;
    children?: JsonRenderNode[];
    on?: Record<string, unknown>;
}
export interface JsonRenderTreeSpec {
    root: JsonRenderNode;
    state?: Record<string, unknown>;
}
export interface JsonRenderFlatElement {
    type: string;
    props?: Record<string, unknown>;
    children?: string[];
    on?: Record<string, unknown>;
    visible?: unknown;
    repeat?: {
        path: string;
        key?: string;
    };
}
export interface JsonRenderFlatSpec {
    root: string;
    elements: Record<string, JsonRenderFlatElement>;
    state?: Record<string, unknown>;
}
export type JsonRenderSpec = JsonRenderTreeSpec | JsonRenderFlatSpec;
export interface TranscriptionResult {
    recording_id: string;
    language: string;
    duration_s: number;
    segments: Segment[];
    insights: Insights;
    ui_spec?: JsonRenderSpec;
}
export type UploadStatus = "idle" | "uploading" | "transcribing" | "done" | "error";
