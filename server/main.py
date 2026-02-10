import json
import os
import tempfile
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from insights import generate_insights
from transcriber import transcribe_audio_file
from translator import translate_transcription

app = FastAPI(title="Audio Update Service")


def load_intent_flagger_module() -> Any | None:
    script_path = Path(__file__).resolve().with_name("intent-flagger.py")
    spec = spec_from_file_location("intent_flagger", script_path)
    if spec is None or spec.loader is None:
        return None

    module = module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
    except (ImportError, Exception) as exc:
        print(f"[warn] intent-flagger unavailable: {exc}")
        return None
    return module


INTENT_FLAGGER = load_intent_flagger_module()


async def run_intent_flagger(translated_output: dict[str, Any]) -> dict[str, Any] | None:
    if INTENT_FLAGGER is None:
        return None

    with tempfile.NamedTemporaryFile(
        mode="w", delete=False, suffix=".json", encoding="utf-8"
    ) as temp_json:
        input_path = temp_json.name
        temp_json.write(json.dumps(translated_output, ensure_ascii=False))

    output_path = input_path.replace(".json", "_flagged.json")

    try:
        await INTENT_FLAGGER.process_and_log(input_path)

        if not os.path.exists(output_path):
            raise RuntimeError("intent-flagger.py did not produce an output file")

        with open(output_path, "r", encoding="utf-8") as flagged_file:
            return json.load(flagged_file)
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        intent_output = await run_intent_flagger(translated_output)
        insights_payload = generate_insights(translated_output)
        return {
            "translate_output": translated_output,
            "intent_output": intent_output,
            "insights": insights_payload.get("insights"),
            "ui_spec": insights_payload.get("ui_spec"),
        }
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
