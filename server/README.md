# Audio Update API

FastAPI service for audio transcription + translation using Sarvam AI.

## Run

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Base URL (local): `http://127.0.0.1:8000`

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

Upload an audio file, transcribe it, detect source language from transcription output, then translate transcript fields to English.

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

JSON object from translation step (same structure as transcription output plus translated fields), for example:

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
  "transcript_english": "translated full transcript"
}
```

## Error responses

- `400`: `language_code` missing in transcription output.
- `500`: upstream/API/runtime failure during transcription or translation.
