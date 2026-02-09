# Bun Central Server

## Run
```bash
bun install
bun run dev
```

## Environment
- `PORT` (default: 3000)
- `ASR_PROVIDER` (`openai` or `runpod`; default: auto)
- `ASR_BASE_URL` (Runpod base URL, e.g. `https://<POD>-8000.proxy.runpod.net/v1`)
- `PYTHON_ASR_URL` (alias for `ASR_BASE_URL`)
- `ASR_API_KEY` (default: `EMPTY` for Runpod)
- `OPENAI_API_KEY` (required for OpenAI transcription + insights)
- `ASR_MODEL` (default: `whisper-1` for OpenAI, `Systran/faster-whisper-large-v3` for Runpod)
- `ASR_LANGUAGE` (optional, e.g. `en`)
- `OPENAI_API_KEY` (also enables AI insights)
- `LLM_MODEL` (default: gpt-4o-mini)

## API
- `GET /` -> serves the upload UI
- `GET /health`
- `POST /v1/transcribe` (multipart form with `audio` file)
- `GET /v1/recordings`
- `GET /v1/models`
- `GET /v1/recordings/:id`
- `GET /v1/recordings/:id/transcript`
- `GET /v1/recordings/:id/insights`

## Notes
- Uses Bun-native APIs only.
- Stores transcripts in a local SQLite DB at `services/bun-server/data/app.db`.
- Stores insights and UI JSON in SQLite for later retrieval.
- Uses AI SDK `experimental_transcribe` with either OpenAI or Runpod (OpenAI-compatible) endpoints.
