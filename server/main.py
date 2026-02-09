import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile

from transcriber import transcribe_audio_file
from translator import translate_transcription

app = FastAPI(title="Audio Update Service")


@app.post("/audio/update")
async def audio_update(audio: UploadFile = File(...)):
    suffix = Path(audio.filename or "input.bin").suffix
    temp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            content = await audio.read()
            temp_file.write(content)

        transcribe_output = transcribe_audio_file(temp_path)
        source_language = transcribe_output.get("language_code")
        if not source_language:
            raise HTTPException(
                status_code=400,
                detail="language_code missing in transcription output",
            )

        translated_output = translate_transcription(
            transcribe_output,
            source_lang=source_language,
        )
        return translated_output
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        await audio.close()
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
