#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { echo "[setup] $*"; }

log "Updating apt and installing system deps (ffmpeg)..."
if command -v apt-get >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y ffmpeg || true
  else
    if [ "$(id -u)" -eq 0 ]; then
      apt-get update -y
      apt-get install -y ffmpeg || true
    else
      log "sudo not available and not running as root. Please install ffmpeg manually."
    fi
  fi
else
  log "apt-get not found. Please install ffmpeg manually."
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  log "ffmpeg not available via apt. Falling back to static build..."
  TMP_DIR="$(mktemp -d)"
  FF_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
  if command -v curl >/dev/null 2>&1; then
    curl -L "$FF_URL" -o "$TMP_DIR/ffmpeg.tar.xz"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$TMP_DIR/ffmpeg.tar.xz" "$FF_URL"
  else
    log "Neither curl nor wget found. Please install ffmpeg manually."
    exit 1
  fi

  tar -xf "$TMP_DIR/ffmpeg.tar.xz" -C "$TMP_DIR"
  FF_DIR="$(find "$TMP_DIR" -maxdepth 1 -type d -name 'ffmpeg-*' | head -n 1)"
  if [ -z "$FF_DIR" ]; then
    log "Failed to unpack ffmpeg."
    exit 1
  fi

  if [ "$(id -u)" -eq 0 ]; then
    install -m 0755 "$FF_DIR/ffmpeg" /usr/local/bin/ffmpeg
    install -m 0755 "$FF_DIR/ffprobe" /usr/local/bin/ffprobe
    log "Installed ffmpeg to /usr/local/bin"
  else
    mkdir -p "$HOME/.local/bin"
    install -m 0755 "$FF_DIR/ffmpeg" "$HOME/.local/bin/ffmpeg"
    install -m 0755 "$FF_DIR/ffprobe" "$HOME/.local/bin/ffprobe"
    log "Installed ffmpeg to $HOME/.local/bin (ensure it's in PATH)"
  fi
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
