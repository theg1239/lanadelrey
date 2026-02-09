# System Design — Audio Intelligence Core + Single Web UI

## Objective
Build a single web interface that accepts an audio file upload, routes it through the audio intelligence pipeline (Whisper + post-processing), and returns a time-aligned transcript plus structured insights. The Conclave integration is an optional interface later; the **core remains the audio intelligence service**.

## Scope (Now)
- Web UI: upload audio file, show transcript + JSON insights.
- Bun central server: ingest, orchestrate, store, return results.
- Python Whisper service: ASR on GPU, return segments + confidence.

## Scope (Later)
- Conclave voice orb integration.
- Live streaming ASR + diarization.
- Advanced NLU (intent, obligation, regulatory phrases).
- Retrieval over recordings.

---

## Architecture Overview
```
[Web UI]
  - Upload audio file
  - Render transcript + JSON insights
        |
        | HTTPS
        v
[Bun Central Server]
  - Upload endpoint (multipart)
  - Orchestration (AI SDK for insights)
  - Result store (metadata + JSON)
  - JSON schema validation
        |
        | HTTP
        v
[OpenAI Transcription API]
  - Official transcription endpoint (/v1/audio/transcriptions)
  - Time-aligned segments

[Storage]
  - Object store for raw audio
  - Postgres for transcripts + metadata
```

### Why Bun as the orchestrator
- Bun-native APIs (`Bun.serve`, `ReadableStream`, `fetch`, `Bun.file`) for fast file handling.
- Simple WebSocket upgrade path for future live ASR.
- AI SDK orchestration for tool calls and structured JSON responses.

---

## Key Data Flow
### 1) Upload + Transcription (MVP)
```
Web UI -> Bun /v1/transcribe -> Python Whisper -> transcript JSON
```
1. Web UI uploads a file.
2. Bun stores raw file (object store or local path).
3. Bun sends file bytes or signed URL to Python Whisper service.
4. OpenAI transcription API returns time-aligned segments + confidence.
5. Bun persists and returns JSON to the client.

---

## API Contracts (Bun)
### POST /v1/transcribe
**Input:** multipart form with `audio` file.
**Output:**
```json
{
  "recording_id": "rec_01H...",
  "language": "en",
  "duration_s": 321.4,
  "segments": [
    {
      "start_ms": 0,
      "end_ms": 1280,
      "text": "Thank you for calling.",
      "confidence": 0.91
    }
  ],
  "insights": {
    "intent": "promise_to_pay",
    "entities": [{"type": "amount", "value": 1200, "currency": "INR"}],
    "obligations": [{"text": "I will pay tomorrow"}]
  }
}
```

---

## OpenAI Transcription Endpoint
Use the official transcription endpoint:\n`POST /v1/audio/transcriptions`\n\nThe Bun server calls this via AI SDK `experimental_transcribe` with the official OpenAI provider.

---

## Data Models
- **recording**: id, filename, duration, language, created_at, storage_uri
- **segment**: recording_id, start_ms, end_ms, text, confidence
- **insight**: recording_id, intent, entities[], obligations[], regulatory_phrases[]

---

## Web UI (MVP)
- Upload button for audio files.
- Progress + status (uploading, transcribing, done).
- Transcript view with timestamps.
- JSON panel for insights.

---

## Security + Governance
- Signed URLs for storage access.
- Basic auth token for MVP endpoints.
- Log access to transcripts for auditing.

---

## Risks & Mitigations
- Large files -> chunked upload + background job.
- Whisper latency -> GPU autoscale + batching.
- JSON drift -> enforce schema validation server-side.

---

## Milestones
1. Upload endpoint + Whisper round-trip
2. Store + fetch transcript
3. Web UI to upload + render
4. Stub insights + JSON renderer
