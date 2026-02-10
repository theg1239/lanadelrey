import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _build_segments(payload: dict[str, Any]) -> list[dict[str, Any]]:
    diarized = payload.get("diarized_transcript") or {}
    entries = diarized.get("entries") or []
    segments: list[dict[str, Any]] = []
    for entry in entries:
        segments.append(
            {
                "speaker": entry.get("speaker_id"),
                "start_s": entry.get("start_time_seconds"),
                "end_s": entry.get("end_time_seconds"),
                "text": entry.get("transcript_english") or entry.get("transcript") or "",
            }
        )
    return segments


def _response_text(response: Any) -> str:
    if hasattr(response, "output_text") and response.output_text:
        return response.output_text
    try:
        return response.output[0].content[0].text  # type: ignore[attr-defined]
    except Exception as exc:
        raise RuntimeError("OpenAI response did not include text output") from exc


def generate_insights(payload: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key)

    transcript = payload.get("transcript_english") or payload.get("transcript") or ""
    segments = _build_segments(payload)
    language = payload.get("language_code") or payload.get("language") or "unknown"
    timestamps = payload.get("timestamps") or {}

    input_payload = {
        "language": language,
        "transcript": transcript,
        "segments": segments,
        "timestamps": {
            "words": timestamps.get("words"),
            "words_english": timestamps.get("words_english"),
            "start_time_seconds": timestamps.get("start_time_seconds"),
            "end_time_seconds": timestamps.get("end_time_seconds"),
        },
    }

    schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "insights": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "summary": {"type": "string"},
                    "primary_intent": {"type": "string"},
                    "intent_confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    "secondary_intents": {"type": "array", "items": {"type": "string"}},
                    "entities": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "type": {"type": "string"},
                                "value": {"type": "string"},
                                "currency": {"type": ["string", "null"]},
                                "confidence": {
                                    "type": ["number", "null"],
                                    "minimum": 0,
                                    "maximum": 1,
                                },
                            },
                            "required": ["type", "value", "currency", "confidence"],
                        },
                    },
                    "obligations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "text": {"type": "string"},
                                "speaker": {"type": ["string", "null"]},
                                "due_date": {"type": ["string", "null"]},
                                "confidence": {
                                    "type": ["number", "null"],
                                    "minimum": 0,
                                    "maximum": 1,
                                },
                            },
                            "required": ["text", "speaker", "due_date", "confidence"],
                        },
                    },
                    "regulatory_flags": {"type": "array", "items": {"type": "string"}},
                    "risk_level": {"type": "string", "enum": ["low", "medium", "high"]},
                    "sentiment": {
                        "type": "string",
                        "enum": ["positive", "neutral", "negative", "mixed"],
                    },
                    "emotions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "label": {"type": "string"},
                                "score": {"type": "number", "minimum": 0, "maximum": 1},
                            },
                            "required": ["label", "score"],
                        },
                    },
                    "pii_detected": {"type": "boolean"},
                    "action_items": {"type": "array", "items": {"type": "string"}},
                    "ingestion": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "detected_language": {"type": "string"},
                            "language_confidence": {"type": "number", "minimum": 0, "maximum": 1},
                            "noise_level": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "unknown"],
                            },
                            "call_quality_score": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1,
                            },
                            "speaker_diarization": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "speaker_count": {"type": "integer", "minimum": 0},
                                    "speaker_labels": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                },
                                "required": ["speaker_count", "speaker_labels"],
                            },
                            "tamper_replay_risk": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "unknown"],
                            },
                            "ingest_flags": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": [
                            "detected_language",
                            "language_confidence",
                            "noise_level",
                            "call_quality_score",
                            "speaker_diarization",
                            "tamper_replay_risk",
                            "ingest_flags",
                        ],
                    },
                    "transcription": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "asr_summary": {"type": "string"},
                            "transcript_language": {"type": "string"},
                            "multilingual_switching": {"type": "boolean"},
                            "asr_confidence": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1,
                            },
                            "domain_terms": {"type": "array", "items": {"type": "string"}},
                            "profanity_terms": {"type": "array", "items": {"type": "string"}},
                            "pii_items": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "type": {"type": "string"},
                                        "value": {"type": "string"},
                                        "confidence": {
                                            "type": "number",
                                            "minimum": 0,
                                            "maximum": 1,
                                        },
                                    },
                                    "required": ["type", "value", "confidence"],
                                },
                            },
                        },
                        "required": [
                            "asr_summary",
                            "transcript_language",
                            "multilingual_switching",
                            "asr_confidence",
                            "domain_terms",
                            "profanity_terms",
                            "pii_items",
                        ],
                    },
                    "understanding": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "financial_entity_layer_count": {
                                "type": "integer",
                                "minimum": 0,
                            },
                            "obligation_count": {"type": "integer", "minimum": 0},
                            "emotion_stress_markers": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "regulatory_phrase_count": {
                                "type": "integer",
                                "minimum": 0,
                            },
                        },
                        "required": [
                            "financial_entity_layer_count",
                            "obligation_count",
                            "emotion_stress_markers",
                            "regulatory_phrase_count",
                        ],
                    },
                    "review": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "needs_human_review": {"type": "boolean"},
                            "review_reasons": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "correction_queue": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "field": {"type": "string"},
                                        "current_value": {"type": "string"},
                                        "suggested_value": {"type": "string"},
                                        "rationale": {"type": "string"},
                                    },
                                    "required": [
                                        "field",
                                        "current_value",
                                        "suggested_value",
                                        "rationale",
                                    ],
                                },
                            },
                        },
                        "required": [
                            "needs_human_review",
                            "review_reasons",
                            "correction_queue",
                        ],
                    },
                },
                "required": [
                    "summary",
                    "primary_intent",
                    "intent_confidence",
                    "secondary_intents",
                    "entities",
                    "obligations",
                    "regulatory_flags",
                    "risk_level",
                    "sentiment",
                    "emotions",
                    "pii_detected",
                    "action_items",
                    "ingestion",
                    "transcription",
                    "understanding",
                    "review",
                ],
            },
            "ui_spec": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "root": {"$ref": "#/$defs/ui_node"},
                },
                "required": ["root"],
            },
        },
        "required": ["insights", "ui_spec"],
        "$defs": {
            "stat_item": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "label": {"type": "string"},
                    "value": {"type": "string"},
                    "tone": {"type": ["string", "null"]},
                },
                "required": ["label", "value", "tone"],
            },
            "entity_row": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "type": {"type": "string"},
                    "value": {"type": "string"},
                    "currency": {"type": ["string", "null"]},
                    "confidence": {
                        "type": ["number", "null"],
                        "minimum": 0,
                        "maximum": 1,
                    },
                },
                "required": ["type", "value", "currency", "confidence"],
            },
            "obligation_item": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "text": {"type": "string"},
                    "speaker": {"type": ["string", "null"]},
                    "due_date": {"type": ["string", "null"]},
                    "confidence": {
                        "type": ["number", "null"],
                        "minimum": 0,
                        "maximum": 1,
                    },
                },
                "required": ["text", "speaker", "due_date", "confidence"],
            },
            "review_item": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "field": {"type": "string"},
                    "current_value": {"type": "string"},
                    "suggested_value": {"type": "string"},
                    "rationale": {"type": "string"},
                },
                "required": ["field", "current_value", "suggested_value", "rationale"],
            },
            "insights_layout_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "subtitle": {"type": ["string", "null"]},
                },
                "required": ["title", "subtitle"],
            },
            "section_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": ["string", "null"]},
                },
                "required": ["title", "description"],
            },
            "summary_card_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "text": {"type": "string"},
                },
                "required": ["title", "text"],
            },
            "stat_grid_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {"$ref": "#/$defs/stat_item"},
                    }
                },
                "required": ["items"],
            },
            "entity_table_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "rows": {
                        "type": "array",
                        "items": {"$ref": "#/$defs/entity_row"},
                    },
                },
                "required": ["title", "rows"],
            },
            "obligation_list_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {"$ref": "#/$defs/obligation_item"},
                    },
                },
                "required": ["title", "items"],
            },
            "tag_list_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "tags"],
            },
            "action_list_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "items": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "items"],
            },
            "confidence_meter_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "label": {"type": "string"},
                    "value": {"type": "number", "minimum": 0, "maximum": 1},
                },
                "required": ["label", "value"],
            },
            "review_queue_props": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {"$ref": "#/$defs/review_item"},
                    },
                },
                "required": ["title", "items"],
            },
            "ui_node": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "InsightsLayout",
                            "Section",
                            "SummaryCard",
                            "StatGrid",
                            "EntityTable",
                            "ObligationList",
                            "TagList",
                            "ActionList",
                            "ConfidenceMeter",
                            "ReviewQueue",
                        ],
                    },
                    "props": {
                        "anyOf": [
                            {"$ref": "#/$defs/insights_layout_props"},
                            {"$ref": "#/$defs/section_props"},
                            {"$ref": "#/$defs/summary_card_props"},
                            {"$ref": "#/$defs/stat_grid_props"},
                            {"$ref": "#/$defs/entity_table_props"},
                            {"$ref": "#/$defs/obligation_list_props"},
                            {"$ref": "#/$defs/tag_list_props"},
                            {"$ref": "#/$defs/action_list_props"},
                            {"$ref": "#/$defs/confidence_meter_props"},
                            {"$ref": "#/$defs/review_queue_props"},
                        ]
                    },
                    "children": {
                        "type": "array",
                        "items": {"$ref": "#/$defs/ui_node"},
                    },
                },
                "required": ["type", "props", "children"],
            },
        },
    }

    system_prompt = (
        "You are an audio intelligence analyst for Challenge 1: Universal Financial Audio "
        "Intelligence Engine. Use ONLY the provided transcript, timestamps, and diarized segments. "
        "Produce structured output that covers ingestion, transcription, financial speech understanding, "
        "and review/correction. If evidence is missing, output conservative values and add a review reason. "
        "Do not invent facts. Return JSON matching the schema exactly."
    )

    user_prompt = (
        "Analyze this call for Problem 1 only. Include: "
        "noise/language/diarization/tamper-risk signals, ASR quality and multilingual switching, "
        "intent/entities/obligations/emotion-regulatory markers, and review/correction guidance. "
        "Return structured insights and a JSON-Render UI spec using allowed components only. "
        "Every UI node must include both props and children keys (use children: [] for leaves). "
        "Ensure ui_spec is directly consistent with insights.\n\n"
        f"INPUT:\n{json.dumps(input_payload, ensure_ascii=False)}"
    )

    request_input = [
        {
            "role": "system",
            "content": [{"type": "input_text", "text": system_prompt}],
        },
        {
            "role": "user",
            "content": [{"type": "input_text", "text": user_prompt}],
        },
    ]
    json_schema_format = {
        "type": "json_schema",
        "name": "insights",
        "schema": schema,
        "strict": True,
    }

    try:
        response = client.responses.create(
            model=model,
            input=request_input,
            text={"format": json_schema_format},
            temperature=0.2,
        )
    except TypeError as exc:
        # Compatibility path for older SDK versions that still use response_format.
        if "text" not in str(exc):
            raise
        response = client.responses.create(
            model=model,
            input=request_input,
            response_format={
                "type": "json_schema",
                "json_schema": json_schema_format,
            },
            temperature=0.2,
        )

    return json.loads(_response_text(response))
