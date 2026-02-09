# Python Whisper Service

## Run (local)
```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Prerequisites
- `ffmpeg` available on the PATH for audio decoding.

## Environment
- `WHISPER_MODEL` (default: `large-v3`)
- `WHISPER_DEVICE` (default: `cuda`)
- `WHISPER_COMPUTE` (default: `float16`)
- `WHISPER_BEAM_SIZE` (default: `5`)
- `WHISPER_LANGUAGE` (optional, e.g. `en`)

## API
- `GET /health`
- `POST /asr` (multipart form with `audio` file)

Response:
```json
{
  "language": "en",
  "duration_s": 321.4,
  "segments": [
    {"start_ms": 0, "end_ms": 1280, "text": "...", "confidence": 0.91}
  ]
}
```
