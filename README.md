# GeoGood — Audio Intelligence (Challenge 1)

Single web interface for audio upload, transcribed by Whisper, orchestrated by a Bun server.

## Structure
- `apps/web` — upload UI
- `services/bun-server` — Bun orchestrator (API + proxy to Whisper)
- `services/python-whisper` — FastAPI Whisper service
- `docs/SYSTEM_DESIGN.md` — system design

## Quick Start
### Runpod setup
```bash
./scripts/setup_runpod.sh
```

### 1) Bun server (OpenAI)
```bash
cd services/bun-server
bun install
OPENAI_API_KEY="your_key" \\
ASR_MODEL="whisper-1" \\
bun run dev
```

### 1b) Bun server (Runpod)
```bash
cd services/bun-server
bun install
ASR_PROVIDER="runpod" \\
ASR_BASE_URL="https://<POD>-8000.proxy.runpod.net/v1" \\
ASR_API_KEY="EMPTY" \\
ASR_MODEL="Systran/faster-whisper-large-v3" \\
bun run dev
```

### 2) Open UI
- Visit `http://localhost:3000`
- Upload an audio file

## API
- `POST /v1/transcribe` (multipart form with `audio` file)
- `GET /health`

## Notes
- Bun server can use OpenAI or Runpod (OpenAI-compatible) transcription based on `ASR_PROVIDER`.
- `OPENAI_API_KEY` is required for OpenAI transcription and enables AI insights.
- Override `LLM_MODEL` if you want a different OpenAI model.
