import { Database } from "bun:sqlite";
import { experimental_transcribe as transcribe, generateText, Output } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { z } from "zod";

const ASR_PROVIDER =
  Bun.env.ASR_PROVIDER ||
  (Bun.env.ASR_BASE_URL || Bun.env.PYTHON_ASR_URL ? "runpod" : "openai");

const rawBaseUrl = Bun.env.ASR_BASE_URL || Bun.env.PYTHON_ASR_URL || "";
const ASR_BASE_URL = rawBaseUrl
  ? rawBaseUrl.endsWith("/v1")
    ? rawBaseUrl
    : rawBaseUrl.replace(/\/+$/, "") + "/v1"
  : "";

const ASR_API_KEY = Bun.env.ASR_API_KEY || Bun.env.OPENAI_API_KEY || "EMPTY";
const ASR_MODEL =
  Bun.env.ASR_MODEL ||
  (ASR_PROVIDER === "runpod" ? "Systran/faster-whisper-large-v3" : "whisper-1");
const ASR_LANGUAGE = Bun.env.ASR_LANGUAGE || "";

const asrProvider =
  ASR_PROVIDER === "runpod" && ASR_BASE_URL
    ? createOpenAI({
        baseURL: ASR_BASE_URL,
        apiKey: ASR_API_KEY,
        name: "runpod",
      })
    : openai;

const OPENAI_TRANSCRIPTION_MODELS = [
  { id: "whisper-1" },
  { id: "gpt-4o-mini-transcribe" },
  { id: "gpt-4o-transcribe" },
  { id: "gpt-4o-transcribe-diarize" },
];

async function fetchRunpodModels(): Promise<Array<{ id: string }>> {
  if (!ASR_BASE_URL) return [];
  try {
    const res = await fetch(`${ASR_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${ASR_API_KEY}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const models = Array.isArray(data?.data) ? (data.data as Array<{ id?: string }>) : [];
    return models.filter((m) => typeof m.id === "string").map((m) => ({ id: m.id as string }));
  } catch {
    return [];
  }
}
const PORT = Number(Bun.env.PORT || 3000);

const indexPath = new URL("../../apps/web/index.html", import.meta.url);
const dbPath = new URL("./data/app.db", import.meta.url).pathname;

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    filename TEXT,
    created_at TEXT,
    language TEXT,
    duration_s REAL
  );

  CREATE TABLE IF NOT EXISTS segments (
    recording_id TEXT,
    idx INTEGER,
    start_ms INTEGER,
    end_ms INTEGER,
    text TEXT,
    confidence REAL
  );

  CREATE TABLE IF NOT EXISTS insights (
    recording_id TEXT PRIMARY KEY,
    summary TEXT,
    intent TEXT,
    entities_json TEXT,
    obligations_json TEXT,
    regulatory_json TEXT,
    ui_json TEXT
  );
`);

function jsonResponse(body: unknown, status = 200, req?: Request) {
  const origin = req?.headers.get("origin") || "*";
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    },
  });
}

const insightSchema = z.object({
  summary: z.string(),
  intent: z.string().nullable(),
  entities: z.array(
    z.object({
      type: z.string(),
      value: z.string(),
      currency: z.string().nullable(),
      date: z.string().nullable(),
    })
  ),
  obligations: z.array(z.object({ text: z.string() })),
  regulatory_phrases: z.array(z.string()),
});

async function buildInsights(transcript: string) {
  const apiKey = Bun.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      summary: transcript.slice(0, 240) + (transcript.length > 240 ? "..." : ""),
      intent: null,
      entities: [],
      obligations: [],
      regulatory_phrases: [],
    };
  }

  const modelName = Bun.env.LLM_MODEL || "gpt-5.2";
  const prompt = [
    "You are extracting structured insights from a financial call transcript.",
    "Return only the structured fields; do not invent facts.",
    "If something is unknown, use null or empty arrays.",
    "",
    "Transcript:",
    transcript.slice(0, 12000),
  ].join("\n");

  try {
    const { output } = await generateText({
      model: openai(modelName),
      system: "You extract structured financial call insights as JSON.",
      prompt,
      output: Output.object({
        schema: insightSchema,
        name: "AudioInsights",
        description: "Structured insights from a call transcript.",
      }),
    });
    return output;
  } catch {
    return {
      summary: transcript.slice(0, 240) + (transcript.length > 240 ? "..." : ""),
      intent: null,
      entities: [],
      obligations: [],
      regulatory_phrases: [],
    };
  }
}

function buildUiSchema(
  transcript: string,
  segments: Array<{ start_ms: number; end_ms: number; text: string }>,
  insights: { summary?: string; intent?: string | null; entities?: Array<{ type: string; value: string }>; obligations?: Array<{ text: string }> }
) {
  const preview = segments.slice(0, 3).map((s) => ({
    type: "timestamp",
    label: s.text,
    ms: s.start_ms,
  }));

  return {
    type: "panel",
    title: "Insights",
    items: [
      { type: "text", value: insights.summary || transcript.slice(0, 240) + (transcript.length > 240 ? "..." : "") },
      { type: "text", value: insights.intent ? `Intent: ${insights.intent}` : "Intent: unknown" },
      ...(insights.entities || []).map((e) => ({
        type: "text",
        value: `Entity: ${e.type} = ${e.value}`,
      })),
      ...(insights.obligations || []).map((o) => ({
        type: "text",
        value: `Obligation: ${o.text}`,
      })),
      ...preview,
    ],
  };
}

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return jsonResponse({ ok: true }, 200, req);
    }

    if (url.pathname === "/health") {
      return jsonResponse({ status: "ok" }, 200, req);
    }

    if (url.pathname === "/" && req.method === "GET") {
      return new Response(Bun.file(indexPath), {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/v1/recordings" && req.method === "GET") {
      const rows = db.query("SELECT * FROM recordings ORDER BY created_at DESC").all();
      return jsonResponse({ recordings: rows }, 200, req);
    }

    if (url.pathname === "/v1/models" && req.method === "GET") {
      if (ASR_PROVIDER === "runpod") {
        const models = await fetchRunpodModels();
        return jsonResponse({ models }, 200, req);
      }
      return jsonResponse({ models: OPENAI_TRANSCRIPTION_MODELS }, 200, req);
    }

    if (url.pathname.startsWith("/v1/recordings/") && req.method === "GET") {
      const id = url.pathname.split("/")[3];
      if (!id) return jsonResponse({ error: "Missing id" }, 400);

      if (url.pathname.endsWith("/transcript")) {
        const segments = db
          .query("SELECT start_ms, end_ms, text, confidence FROM segments WHERE recording_id = ? ORDER BY idx ASC")
          .all(id);
        return jsonResponse({ recording_id: id, segments }, 200, req);
      }

      if (url.pathname.endsWith("/insights")) {
        const row = db.query("SELECT * FROM insights WHERE recording_id = ?").get(id);
        if (!row) return jsonResponse({ error: "Not found" }, 404, req);
        return jsonResponse({
          recording_id: id,
          summary: row.summary,
          intent: row.intent,
          entities: row.entities_json ? JSON.parse(row.entities_json) : [],
          obligations: row.obligations_json ? JSON.parse(row.obligations_json) : [],
          regulatory_phrases: row.regulatory_json ? JSON.parse(row.regulatory_json) : [],
          ui: row.ui_json ? JSON.parse(row.ui_json) : null,
        }, 200, req);
      }

      const recording = db.query("SELECT * FROM recordings WHERE id = ?").get(id);
      if (!recording) return jsonResponse({ error: "Not found" }, 404, req);
      return jsonResponse({ recording }, 200, req);
    }

    if (url.pathname === "/v1/transcribe" && req.method === "POST") {
      const form = await req.formData();
      const file = form.get("audio");
      const requestedModel = form.get("model");

      if (!(file instanceof File)) {
        return jsonResponse({ error: "Missing audio file" }, 400, req);
      }

      let transcript;
      const audioBytes = new Uint8Array(await file.arrayBuffer());
      const runTranscribe = async (modelId: string) =>
        transcribe({
          model: asrProvider.transcription(modelId),
          audio: audioBytes,
          providerOptions: {
            openai: {
              ...(ASR_LANGUAGE ? { language: ASR_LANGUAGE } : {}),
              timestampGranularities: ["segment"],
            },
          },
        });

      try {
        const modelId =
          (typeof requestedModel === "string" && requestedModel.trim()) || ASR_MODEL;
        transcript = await runTranscribe(modelId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResponse({ error: "ASR failed", detail: message }, 502, req);
      }

      const asr = {
        language: transcript.language || null,
        duration_s: transcript.durationInSeconds || null,
        segments: (transcript.segments || []).map((s) => ({
          start_ms: Math.round(s.startSecond * 1000),
          end_ms: Math.round(s.endSecond * 1000),
          text: s.text,
          confidence: null,
        })),
        text: transcript.text || "",
      };
      const recordingId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      db.query(
        "INSERT INTO recordings (id, filename, created_at, language, duration_s) VALUES (?, ?, ?, ?, ?)"
      ).run(recordingId, file.name || "audio.wav", createdAt, asr.language || null, asr.duration_s || null);

      const insertSeg = db.query(
        "INSERT INTO segments (recording_id, idx, start_ms, end_ms, text, confidence) VALUES (?, ?, ?, ?, ?, ?)"
      );

      let segments = Array.isArray(asr.segments) ? asr.segments : [];
      if (segments.length === 0 && asr.text) {
        segments = [
          {
            start_ms: 0,
            end_ms: Math.round((asr.duration_s || 0) * 1000),
            text: asr.text,
            confidence: null,
          },
        ];
      }
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        insertSeg.run(recordingId, i, s.start_ms, s.end_ms, s.text, s.confidence ?? null);
      }

      const transcriptText =
        segments.length > 0
          ? segments.map((s: { text?: string }) => s.text || "").join(" ").trim()
          : (asr.text || "").trim();
      const insights = await buildInsights(transcriptText);
      const ui = buildUiSchema(transcriptText, segments, insights);

      db.query(
        "INSERT OR REPLACE INTO insights (recording_id, summary, intent, entities_json, obligations_json, regulatory_json, ui_json) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        recordingId,
        insights.summary || null,
        insights.intent || null,
        JSON.stringify(insights.entities || []),
        JSON.stringify(insights.obligations || []),
        JSON.stringify(insights.regulatory_phrases || []),
        JSON.stringify(ui)
      );

      return jsonResponse({
        recording_id: recordingId,
        language: asr.language || null,
        duration_s: asr.duration_s || null,
        segments,
        insights,
        ui,
      }, 200, req);
    }

    return jsonResponse({ error: "Not found" }, 404, req);
  },
});

console.log(`Bun server listening on :${PORT}`);
