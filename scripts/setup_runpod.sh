#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { echo "[setup] $*"; }

log "Updating apt and installing system deps (ffmpeg)..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y ffmpeg
else
  log "apt-get not found. Please install ffmpeg manually."
fi

log "Setting up Python venv and installing Whisper service deps..."
PY_DIR="$ROOT_DIR/services/python-whisper"
python3 -m venv "$PY_DIR/.venv"
# shellcheck disable=SC1090
source "$PY_DIR/.venv/bin/activate"
pip install --upgrade pip
pip install -r "$PY_DIR/requirements.txt"

deactivate

log "Installing Bun dependencies..."
BUN_DIR="$ROOT_DIR/services/bun-server"
if command -v bun >/dev/null 2>&1; then
  (cd "$BUN_DIR" && bun install)
else
  log "bun not found. Install Bun first: https://bun.sh/docs/installation"
fi

log "Done. Next steps:"
log "1) Start FastAPI: cd services/python-whisper && . .venv/bin/activate && uvicorn app:app --host 0.0.0.0 --port 8000"
log "2) Start Bun: cd services/bun-server && bun run dev"
log "3) Open UI: http://localhost:3000"
