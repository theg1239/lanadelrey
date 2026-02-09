import type { TranscriptionResult } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function transcribeAudio(
  file: File,
  onProgress?: (status: string) => void,
): Promise<TranscriptionResult> {
  onProgress?.("uploading");

  const formData = new FormData();
  formData.append("audio", file);

  const res = await fetch(`${API_BASE}/v1/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Transcription failed (${res.status})`);
  }

  onProgress?.("done");
  return res.json();
}
