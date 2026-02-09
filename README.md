# GeoGood — Audio Intelligence (Challenge 1)

Single web interface for audio upload, transcribed by Whisper, orchestrated by a Bun server.

## Structure
- `apps/web` — upload UI
- `services/bun-server` — Bun orchestrator (API + proxy to Whisper)
- `services/python-whisper` — FastAPI Whisper service
- `docs/SYSTEM_DESIGN.md` — system design

## Quick Start
### 1) Python Whisper service
```bash
cd services/python-whisper
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

### 2) Bun server
```bash
cd services/bun-server
bun install
bun run dev
```

### 3) Open UI
- Visit `http://localhost:3000`
- Upload an audio file

## API
- `POST /v1/transcribe` (multipart form with `audio` file)
- `GET /health`

## Notes
- Bun server forwards uploads to the FastAPI Whisper service.
- Whisper runs on GPU when available.
- Set `OPENAI_API_KEY` to enable AI insights (intent/entities/obligations).
- Override `LLM_MODEL` if you want a different OpenAI model.
