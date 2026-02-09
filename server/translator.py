import json
import os
from copy import deepcopy
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


def translate_text(
    client: SarvamAI,
    text: str,
    source_lang: str,
    target_lang: str = "en-IN",
) -> str:
    if not text or text == "<nospeech>":
        return text

    response = client.text.translate(
        input=text,
        source_language_code=source_lang,
        target_language_code=target_lang,
        speaker_gender="Male",
        mode="formal",
        model="mayura:v1",
    )

    if hasattr(response, "translated_text"):
        return response.translated_text
    if isinstance(response, dict):
        return response.get("translated_text", response.get("text", text))
    return str(response)


def translate_transcription(
    transcription_data: dict[str, Any],
    *,
    source_lang: str | None = None,
    target_lang: str = "en-IN",
) -> dict[str, Any]:
    data = deepcopy(transcription_data)
    source_language = source_lang or data.get("language_code")
    if not source_language:
        raise ValueError(
            "Source language not found. Expected language_code in transcription output."
        )

    client = get_client()

    if "transcript" in data:
        data["transcript_english"] = translate_text(
            client, data["transcript"], source_language, target_lang
        )

    timestamps = data.get("timestamps")
    words = timestamps.get("words") if isinstance(timestamps, dict) else None
    if isinstance(words, list):
        timestamps["words_english"] = [
            translate_text(client, word, source_language, target_lang) for word in words
        ]

    diarized = data.get("diarized_transcript")
    entries = diarized.get("entries") if isinstance(diarized, dict) else None
    if isinstance(entries, list):
        for entry in entries:
            transcript = entry.get("transcript")
            if transcript is not None:
                entry["transcript_english"] = translate_text(
                    client, transcript, source_language, target_lang
                )

    return data


def translate_transcript_file(
    input_file: str,
    output_file: str,
    *,
    target_lang: str = "en-IN",
) -> None:
    data = json.loads(Path(input_file).read_text(encoding="utf-8"))
    translated = translate_transcription(data, target_lang=target_lang)
    Path(output_file).write_text(
        json.dumps(translated, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    translate_transcript_file("transcribe_output.json", "translate_output.json")
