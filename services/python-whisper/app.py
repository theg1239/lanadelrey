import math
import os
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

app = FastAPI(title="Whisper ASR Service", version="0.1.0")

_model = None


def _load_model():
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:  # pragma: no cover - import error path
        raise RuntimeError(
            "faster-whisper is not installed. Install it in this service environment."
        ) from exc

    model_name = os.getenv("WHISPER_MODEL", "large-v3")
    device = os.getenv("WHISPER_DEVICE", "cuda")
    compute_type = os.getenv("WHISPER_COMPUTE", "float16")

    return WhisperModel(model_name, device=device, compute_type=compute_type)


def get_model():
    global _model
    if _model is None:
        _model = _load_model()
    return _model


class Segment(BaseModel):
    start_ms: int
    end_ms: int
    text: str
    confidence: Optional[float] = None


class ASRResponse(BaseModel):
    language: Optional[str] = None
    duration_s: Optional[float] = None
    segments: List[Segment]


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/asr", response_model=ASRResponse)
async def asr(audio: UploadFile = File(...)):
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    suffix = Path(audio.filename).suffix or ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name

        model = get_model()
        segments_iter, info = model.transcribe(
            tmp_path,
            beam_size=int(os.getenv("WHISPER_BEAM_SIZE", "5")),
            vad_filter=True,
            language=os.getenv("WHISPER_LANGUAGE") or None,
        )

        segments: List[Segment] = []
        for seg in segments_iter:
            confidence = None
            if getattr(seg, "avg_logprob", None) is not None:
                # Convert log-probability to a 0-1 confidence score
                confidence = round(1.0 / (1.0 + math.exp(-seg.avg_logprob)), 3)

            segments.append(
                Segment(
                    start_ms=int(seg.start * 1000),
                    end_ms=int(seg.end * 1000),
                    text=(seg.text or "").strip(),
                    confidence=confidence,
                )
            )

        return ASRResponse(
            language=getattr(info, "language", None),
            duration_s=getattr(info, "duration", None),
            segments=segments,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - runtime errors
        raise HTTPException(status_code=500, detail="ASR failed") from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
