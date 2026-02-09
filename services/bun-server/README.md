# Bun Central Server

## Run
```bash
bun install
bun run dev
```

## Environment
- `PORT` (default: 3000)
- `PYTHON_ASR_URL` (default: http://localhost:8000/asr)
- `OPENAI_API_KEY` (optional, enables AI insights)
- `LLM_MODEL` (default: gpt-4o-mini)

## API
- `GET /` -> serves the upload UI
- `GET /health`
- `POST /v1/transcribe` (multipart form with `audio` file)
- `GET /v1/recordings`
- `GET /v1/recordings/:id`
- `GET /v1/recordings/:id/transcript`
- `GET /v1/recordings/:id/insights`

## Notes
- Uses Bun-native APIs only.
- Stores transcripts in a local SQLite DB at `services/bun-server/data/app.db`.
- Stores insights and UI JSON in SQLite for later retrieval.
- Forwards uploads to the Python Whisper service.
