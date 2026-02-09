import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sarvamai import SarvamAI

load_dotenv()


def get_client() -> SarvamAI:
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        raise RuntimeError("SARVAM_API_KEY is not set")
    return SarvamAI(api_subscription_key=api_key)


def transcribe_audio_file(
    audio_path: str,
    *,
    language_code: str = "unknown",
    model: str = "saaras:v3",
    with_timestamps: bool = True,
    with_diarization: bool = True,
    num_speakers: int | None = None,
) -> dict[str, Any]:
    client = get_client()

    create_job_kwargs: dict[str, Any] = {
        "language_code": language_code,
        "model": model,
        "with_timestamps": with_timestamps,
        "with_diarization": with_diarization,
    }
    if num_speakers is not None:
        create_job_kwargs["num_speakers"] = num_speakers

    job = client.speech_to_text_job.create_job(**create_job_kwargs)
    job.upload_files(file_paths=[audio_path])
    job.start()
    job.wait_until_complete()

    if job.is_failed():
        raise RuntimeError("Speech-to-text job failed")

    output_dir = Path(tempfile.mkdtemp(prefix="sarvam_stt_"))
    try:
        job.download_outputs(output_dir=str(output_dir))
        json_files = sorted(output_dir.glob("*.json"))
        if not json_files:
            raise RuntimeError("Transcription output JSON not found")

        output_file = max(json_files, key=lambda file: file.stat().st_mtime)
        return json.loads(output_file.read_text(encoding="utf-8"))
    finally:
        shutil.rmtree(output_dir, ignore_errors=True)


def transcribe_audio_to_file(audio_path: str, output_file: str) -> None:
    result = transcribe_audio_file(audio_path)
    Path(output_file).write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    sample_audio = os.getenv("SAMPLE_AUDIO_PATH")
    if not sample_audio:
        raise RuntimeError("Set SAMPLE_AUDIO_PATH to run transcriber.py directly")

    transcribe_audio_to_file(sample_audio, "transcribe_output.json")
