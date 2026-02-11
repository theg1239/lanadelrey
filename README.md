# Delrey

> **Turn any audio into actionable financial intelligence.**
> Upload a call recording in any language or format, and Delrey transcribes, translates, diarizes, extracts intents, and surfaces structured insights, all in seconds.

---

## What It Does

Delrey is an end-to-end audio intelligence platform built for the fintech domain. It accepts raw audio (50+ formats, 12+ languages), runs it through a multi-stage AI pipeline, and delivers:

| Stage | What Happens |
|-------|-------------|
| **Ingest** | Accepts WAV, MP3, OGG, FLAC, WebM, M4A, AAC, OPUS, AMR, and more. Auto codec detection & noise profiling. |
| **Transcribe** | Domain-tuned ASR via [Sarvam AI](https://www.sarvam.ai/) (`saaras:v3`) with per-word timestamps and speaker diarization. |
| **Translate** | Automatic source-language detection (script-level inference for Tamil, Kannada, etc.) and translation to English via Sarvam `mayura:v1`. |
| **Intent Flagging** | Classifies each utterance (Agreement, Conditional Agreement, Delay Request, Refusal, etc.) using [Backboard](https://backboard.com/) stateful assistants. |
| **Insights & UI** | GPT-5-mini generates structured insights (entities, obligations, sentiment, summary) and a JSON-Render `ui_spec` for dynamic, data-driven UI cards. |

---

## Architecture

```
┌──────────────┐        ┌──────────────────────────────────────────┐
│   Next.js    │  POST  │           FastAPI Server (Python)        │
│   Frontend   │───────▶│                                          │
│  (React 19)  │◁───────│  transcriber ─▶ translator ─▶ intent    │
│              │  JSON  │       ▼              ▼          flagger  │
└──────────────┘        │   Sarvam AI     Sarvam AI    Backboard   │
                        │       └──────┬───────┘           │       │
                        │              ▼                   │       │
                        │     insights (OpenAI GPT-5.2)◁────┘       │
                        │         ▼                                │
                        │     ui_spec (JSON-Render)                │
                        └──────────────────────────────────────────┘
```

### Project Structure

```
web/            Next.js 16 frontend (React 19, Tailwind, Motion, JSON-Render)
server/         FastAPI backend (Sarvam AI, OpenAI, Backboard)
scripts/        Deployment helpers (RunPod GPU setup)
```

---

## Quick Start

### Prerequisites

- **Python ≥ 3.12** + [`uv`](https://docs.astral.sh/uv/) (server)
- **Node.js ≥ 20** + `pnpm` (web)
- API keys: `SARVAM_API_KEY`, `OPENAI_API_KEY`, `BACKBOARD_API_KEY`

### 1. Start the API server

```bash
cd server
cp .env.example .env   # fill in your API keys
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the frontend

```bash
cd web
pnpm install
pnpm dev                # → http://localhost:3000
```

### 3. Use the platform

1. Visit **http://localhost:3000**
2. Upload an audio file (or pick one from the built-in library)
3. Watch the pipeline run: transcript, translation, intent flags, and AI insights appear in real time

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/audio/update` | Upload an audio file (`multipart/form-data`, field: `audio`). Returns transcription, translation, intent flags, insights, and UI spec. |
| `GET` | `/health` | Health check. Returns `{ "status": "ok" }` |

### Example

```bash
curl -X POST http://localhost:8000/audio/update \
  -F "audio=@call_recording.wav"
```

---

## Key Technologies

- **[Sarvam AI](https://www.sarvam.ai/)**: Multilingual speech-to-text & translation, optimized for Indian languages
- **[OpenAI GPT-4o-mini](https://openai.com/)**: Structured insight extraction with JSON-Render UI generation
- **[Backboard](https://backboard.com/)**: Stateful AI assistants for per-utterance intent classification
- **[Next.js 16](https://nextjs.org/)** + **React 19**: App router, server components, streaming
- **[JSON-Render](https://json-render.com/)**: Dynamic, schema-driven UI cards from LLM output
- **FastAPI** + **uv**: High-performance Python API server
- **Runpod**

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SARVAM_API_KEY` | Yes | Sarvam AI API key for transcription & translation |
| `OPENAI_API_KEY` | Yes | OpenAI API key for insights generation |
| `BACKBOARD_API_KEY` | Yes | Backboard API key for intent classification |
| `OPENAI_MODEL` | No | Override the LLM model (default: `gpt-4o-mini`) |