export interface Segment {
    start_ms: number;
    end_ms: number;
    text: string;
    confidence: number;
}
export interface Entity {
    type: string;
    value: string | number;
    currency?: string;
}
export interface Obligation {
    text: string;
}
export interface Insights {
    intent: string;
    entities: Entity[];
    obligations: Obligation[];
}
export interface TranscriptionResult {
    recording_id: string;
    language: string;
    duration_s: number;
    segments: Segment[];
    insights: Insights;
}
export type UploadStatus = "idle" | "uploading" | "transcribing" | "done" | "error";
