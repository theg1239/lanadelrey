# Audio Update API

FastAPI service for Challenge 1 audio intelligence:
- transcription + translation using Sarvam AI
- structured `insights` generation using OpenAI Responses API
- `ui_spec` output for JSON-Render UIs

## Run

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Base URL (local): `http://127.0.0.1:8000`

## Environment

Required:
- `SARVAM_API_KEY`
- `OPENAI_API_KEY`

Optional:
- `OPENAI_MODEL` (default: `gpt-4o-mini`)

## Routes

### `GET /health`

Health check endpoint.

#### Input

No input.

#### Output

```json
{
  "status": "ok"
}
```

### `POST /audio/update`

Upload an audio file, transcribe it, detect source language from transcription output, translate transcript fields to English, then generate structured `insights` + `ui_spec`.

#### Input

`multipart/form-data`

- Field name: `audio`
- Type: file (`.wav`, `.mp3`, `.m4a`, etc.)

Example:

```bash
curl -X POST "http://127.0.0.1:8000/audio/update" \
  -F "audio=@/path/to/sample.m4a"
```

#### Output

JSON object containing translated transcript data plus structured `insights` and a renderable `ui_spec`.

```json
{
  "request_id": "20260209_xxxxxxxx",
  "transcript": "original transcript text",
  "timestamps": {
    "words": ["..."],
    "start_time_seconds": [0.01],
    "end_time_seconds": [0.25],
    "words_english": ["translated word/segment"]
  },
  "diarized_transcript": {
    "entries": [
      {
        "transcript": "original segment",
        "start_time_seconds": 0.01,
        "end_time_seconds": 0.25,
        "speaker_id": "1",
        "transcript_english": "translated segment"
      }
    ]
  },
  "language_code": "kn-IN",
  "language_probability": 0.991,
  "transcript_english": "translated full transcript",
  "insights": {
    "primary_intent": "promise_to_pay",
    "intent_confidence": 0.92,
    "entities": [],
    "obligations": [],
    "ingestion": {
      "noise_level": "low",
      "call_quality_score": 0.88
    },
    "transcription": {
      "asr_confidence": 0.9
    },
    "understanding": {
      "financial_entity_layer_count": 2
    },
    "review": {
      "needs_human_review": false
    }
  },
  "ui_spec": {
    "root": {
      "type": "InsightsLayout"
    }
  }
}
```

## Error responses

- `400`: `language_code` missing in transcription output.
- `500`: upstream/API/runtime failure during transcription or translation.
