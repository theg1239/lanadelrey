import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import {
  generateText,
  experimental_generateSpeech as generateSpeech,
  experimental_transcribe as transcribe,
  NoSpeechGeneratedError,
  NoTranscriptGeneratedError,
  stepCountIs,
  tool,
} from "ai";
import { z } from "zod";
import { listPublicAudioItems, readPublicFileBytes } from "@/lib/library-audio";
import { runAudioUpdatePipeline } from "@/lib/server/audio-update";
import {
  clearVoiceTurnProgress,
  setVoiceTurnProgress,
} from "@/lib/voice-agent-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CoreMessage = {
  role: "user" | "assistant";
  content: string;
};

type RecordingTranscriptSegment = {
  text: string;
  startSecond: number;
  endSecond: number;
};

type RecordingAnalysis = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  topics: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
};

type PythonInsights = {
  summary?: unknown;
  primary_intent?: unknown;
  secondary_intents?: unknown;
  entities?: unknown;
  obligations?: unknown;
  regulatory_flags?: unknown;
  sentiment?: unknown;
  action_items?: unknown;
};

type CachedRecording = {
  name: string;
  url: string;
  index: number;
  analyzedAt: string;
  transcript: {
    text: string;
    language?: string;
    durationInSeconds?: number;
    segments: RecordingTranscriptSegment[];
  };
  analysis: RecordingAnalysis;
};

const globalForRecordingCache = globalThis as unknown as {
  __geoGoodRecordingCache?: Map<string, CachedRecording>;
};
const recordingCache =
  globalForRecordingCache.__geoGoodRecordingCache ??
  (globalForRecordingCache.__geoGoodRecordingCache =
    new Map<string, CachedRecording>());

type ActiveCallRecordingContext = {
  name?: string;
  index?: number;
  language?: string;
  durationInSeconds?: number;
  transcriptText: string;
  segments: RecordingTranscriptSegment[];
  analysis?: RecordingAnalysis;
};

const EMPTY_RECORDING_ANALYSIS: RecordingAnalysis = {
  summary: "",
  keyPoints: [],
  actionItems: [],
  topics: [],
  sentiment: "neutral",
};

const safeJsonParse = (value: unknown): unknown | null => {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeMessages = (value: unknown): CoreMessage[] => {
  if (!Array.isArray(value)) return [];
  const out: CoreMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && typeof content === "string") {
      const text = content.trim();
      if (text) out.push({ role, content: text });
    }
  }
  return out.slice(-24);
};

const sanitizeText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
};

const asFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => sanitizeText(v))
    .filter((t) => t.length > 0);
};

const isMeaningful = (text: string): boolean => {
  if (!text) return false;
  const lowered = text.toLowerCase();
  return lowered !== "<nospeech>" && lowered !== "nospeech";
};

const sanitizeCallStateSegments = (value: unknown): RecordingTranscriptSegment[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const seg = item as {
        text?: unknown;
        startSecond?: unknown;
        endSecond?: unknown;
      };
      const text = sanitizeText(seg.text);
      if (!isMeaningful(text)) return null;
      const startSecond = asFiniteNumber(seg.startSecond) ?? 0;
      const endSecond = asFiniteNumber(seg.endSecond) ?? startSecond;
      return {
        text,
        startSecond,
        endSecond: Math.max(startSecond, endSecond),
      } satisfies RecordingTranscriptSegment;
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
};

const sanitizeCallStateAnalysis = (value: unknown): RecordingAnalysis | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as {
    summary?: unknown;
    keyPoints?: unknown;
    actionItems?: unknown;
    topics?: unknown;
    sentiment?: unknown;
  };

  const summary = sanitizeText(raw.summary);
  const keyPoints = asStringArray(raw.keyPoints);
  const actionItems = asStringArray(raw.actionItems);
  const topics = asStringArray(raw.topics);
  const sentimentRaw = sanitizeText(raw.sentiment).toLowerCase();
  const sentiment: RecordingAnalysis["sentiment"] =
    sentimentRaw === "positive" || sentimentRaw === "negative" || sentimentRaw === "mixed"
      ? (sentimentRaw as RecordingAnalysis["sentiment"])
      : "neutral";

  if (!summary && keyPoints.length === 0 && actionItems.length === 0 && topics.length === 0) {
    return undefined;
  }

  return {
    summary,
    keyPoints,
    actionItems,
    topics,
    sentiment,
  };
};

const buildActiveCallRecordingContext = (callState: unknown): ActiveCallRecordingContext | null => {
  if (!callState || typeof callState !== "object") return null;
  const state = callState as {
    activeRecordingName?: unknown;
    activeRecordingIndex?: unknown;
    activeRecordingLanguage?: unknown;
    activeRecordingDurationInSeconds?: unknown;
    activeRecordingTranscriptText?: unknown;
    activeRecordingSegments?: unknown;
    activeRecordingAnalysis?: unknown;
    activeRecordingSummary?: unknown;
  };

  const name = sanitizeText(state.activeRecordingName);
  const rawIndex = asFiniteNumber(state.activeRecordingIndex);
  const index = typeof rawIndex === "number" ? Math.floor(rawIndex) : undefined;
  const language = sanitizeText(state.activeRecordingLanguage) || undefined;
  const durationInSeconds = asFiniteNumber(state.activeRecordingDurationInSeconds);
  const segments = sanitizeCallStateSegments(state.activeRecordingSegments);
  const transcriptTextFromState = sanitizeText(state.activeRecordingTranscriptText);
  const transcriptText = transcriptTextFromState || segments.map((seg) => seg.text).join(" ").trim();

  const parsedAnalysis = sanitizeCallStateAnalysis(state.activeRecordingAnalysis);
  const summaryFromState = sanitizeText(state.activeRecordingSummary);
  const analysis =
    parsedAnalysis ||
    (isMeaningful(summaryFromState)
      ? { ...EMPTY_RECORDING_ANALYSIS, summary: summaryFromState }
      : undefined);

  const hasContext =
    Boolean(name) ||
    typeof index === "number" ||
    Boolean(language) ||
    typeof durationInSeconds === "number" ||
    isMeaningful(transcriptText) ||
    segments.length > 0 ||
    Boolean(analysis);

  if (!hasContext) return null;

  return {
    name: name || undefined,
    index,
    language,
    durationInSeconds,
    transcriptText,
    segments,
    analysis,
  };
};

const toCachedRecording = (context: ActiveCallRecordingContext): CachedRecording => {
  return {
    name: context.name || "Current recording",
    url: "",
    index: typeof context.index === "number" ? context.index : 0,
    analyzedAt: new Date().toISOString(),
    transcript: {
      text: context.transcriptText,
      language: context.language,
      durationInSeconds: context.durationInSeconds,
      segments: context.segments,
    },
    analysis: context.analysis ?? EMPTY_RECORDING_ANALYSIS,
  };
};

const isTargetingContextRecording = (
  context: ActiveCallRecordingContext | null,
  args: { index?: number; name?: string },
): boolean => {
  if (!context) return false;
  const idx = typeof args.index === "number" ? Math.floor(args.index) : undefined;
  const rawName = sanitizeText(args.name);

  const indexMatch =
    typeof idx === "number" && typeof context.index === "number" && idx === context.index;
  const nameMatch =
    rawName.length > 0 &&
    Boolean(context.name) &&
    (normalizeRecordingKey(rawName) === normalizeRecordingKey(context.name || "") ||
      stripExtension(normalizeRecordingKey(rawName)) ===
        stripExtension(normalizeRecordingKey(context.name || "")));
  return indexMatch || nameMatch;
};

const scoreTranscriptSegments = (
  segments: RecordingTranscriptSegment[],
  query: string,
  topK: number,
) => {
  const q = sanitizeText(query).toLowerCase();
  if (!q) return [] as Array<{ startSecond: number; endSecond: number; text: string }>;
  const qTokens = q
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 12);

  return segments
    .map((seg) => {
      const t = seg.text.toLowerCase();
      let score = 0;
      if (t.includes(q)) score += 10;
      for (const tok of qTokens) {
        if (t.includes(tok)) score += 1;
      }
      return { seg, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => ({
      startSecond: x.seg.startSecond,
      endSecond: x.seg.endSecond,
      text: x.seg.text,
    }));
};

const buildSystemPrompt = (
  callState: unknown,
  activeContext: ActiveCallRecordingContext | null,
) => {
  const stateJson =
    callState && typeof callState === "object"
      ? JSON.stringify(callState)
      : "{}";

  return [
    "You are a real-time voice agent inside a call UI.",
    "You can see the conversation transcript (messages) and a call_state JSON blob.",
    "If the user asks about what is being recorded, what just happened, whether the mic is on, timing, or the flow of the call: answer from call_state and the transcript.",
    "You also have tools to work with the user's recording library (list, analyze, and search recordings).",
    "If call_state already includes active recording analysis/transcript context, prefer that context first for fast answers.",
    "Use query_active_context for precise excerpt retrieval from active call_state context before falling back to library tools.",
    "If the user says e.g. 'recording 3' or 'analyze recording 3', call analyze_recording with index=3.",
    "If the user references a file name like 'Sample3' or 'Sample3.mp3', call analyze_recording with name.",
    "If the user asks a question about a recording but no recording has been analyzed yet, call list_recordings and ask which one to analyze.",
    "When call_state context does not contain the requested detail, use get_recording/search_recording for library recordings.",
    "",
    "Tool examples:",
    "User: what did they agree to?",
    "-> query_active_context({ query: 'what did they agree to' }) (if active call_state recording exists)",
    "User: recording 3",
    "-> analyze_recording({ index: 3 })",
    "User: analyze Sample3",
    "-> analyze_recording({ name: 'Sample3' })",
    "User: what did they agree to in recording 3?",
    "-> search_recording({ query: 'what did they agree to', index: 3 })",
    "If the information is not present, say you don't know. Do not invent audio you did not receive.",
    "Keep responses concise and speakable.",
    "",
    `active_call_state_recording_present: ${activeContext ? "yes" : "no"}`,
    activeContext?.name ? `active_call_state_recording_name: ${activeContext.name}` : "",
    typeof activeContext?.index === "number"
      ? `active_call_state_recording_index: ${activeContext.index}`
      : "",
    activeContext?.language ? `active_call_state_recording_language: ${activeContext.language}` : "",
    typeof activeContext?.durationInSeconds === "number"
      ? `active_call_state_recording_duration_seconds: ${activeContext.durationInSeconds}`
      : "",
    activeContext?.segments.length
      ? `active_call_state_recording_segments: ${activeContext.segments.length}`
      : "",
    `call_state: ${stateJson}`,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
};

const normalizeRecordingKey = (name: string) => name.trim().toLowerCase();

const stripExtension = (name: string) => name.replace(/\.[a-z0-9]+$/i, "");

const pickRecording = async (opts: { index?: number; name?: string }) => {
  const items = await listPublicAudioItems();
  const index = opts.index;
  const name = opts.name?.trim();

  if (typeof index === "number" && Number.isFinite(index)) {
    const i = Math.floor(index);
    if (i < 1 || i > items.length) {
      throw new Error(
        `Recording index ${i} is out of range. The library has ${items.length} recordings.`,
      );
    }
    return { item: items[i - 1], index: i, itemsCount: items.length };
  }

  if (name) {
    const inputKey = normalizeRecordingKey(name);
    const inputBase = stripExtension(inputKey);

    const exact = items.find(
      (it) =>
        normalizeRecordingKey(it.name) === inputKey ||
        stripExtension(normalizeRecordingKey(it.name)) === inputBase,
    );
    if (exact) {
      const idx = items.findIndex((it) => it.name === exact.name) + 1;
      return { item: exact, index: idx, itemsCount: items.length };
    }

    const contains = items.find((it) =>
      stripExtension(normalizeRecordingKey(it.name)).includes(inputBase),
    );
    if (contains) {
      const idx = items.findIndex((it) => it.name === contains.name) + 1;
      return { item: contains, index: idx, itemsCount: items.length };
    }

    throw new Error(
      `No recording named '${name}' found. Try 'recording 3' or ask me to list recordings.`,
    );
  }

  throw new Error("No recording specified.");
};

const buildSegmentsFromDiarizedEntries = (entries: unknown): RecordingTranscriptSegment[] => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((e) => {
      if (!e || typeof e !== "object") return null;
      const ent = e as {
        transcript?: unknown;
        transcript_english?: unknown;
        start_time_seconds?: unknown;
        end_time_seconds?: unknown;
      };
      const tEn = sanitizeText(ent.transcript_english);
      const tOg = sanitizeText(ent.transcript);
      const text = isMeaningful(tEn) ? tEn : tOg;
      if (!isMeaningful(text)) return null;
      const startSecond = typeof ent.start_time_seconds === "number" ? ent.start_time_seconds : 0;
      const endSecond = typeof ent.end_time_seconds === "number" ? ent.end_time_seconds : startSecond;
      return {
        text,
        startSecond,
        endSecond,
      } satisfies RecordingTranscriptSegment;
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
};

const buildSegmentsFromTimestamps = (timestamps: unknown): RecordingTranscriptSegment[] => {
  if (!timestamps || typeof timestamps !== "object") return [];
  const t = timestamps as {
    words?: unknown;
    words_english?: unknown;
    start_time_seconds?: unknown;
    end_time_seconds?: unknown;
  };
  const wordsEnglish = Array.isArray(t.words_english) ? t.words_english : [];
  const wordsOriginal = Array.isArray(t.words) ? t.words : [];
  const starts = Array.isArray(t.start_time_seconds) ? t.start_time_seconds : [];
  const ends = Array.isArray(t.end_time_seconds) ? t.end_time_seconds : [];

  const total = Math.max(wordsEnglish.length, wordsOriginal.length, starts.length, ends.length);
  const out: RecordingTranscriptSegment[] = [];
  for (let i = 0; i < total; i += 1) {
    const tEn = sanitizeText(wordsEnglish[i]);
    const tOg = sanitizeText(wordsOriginal[i]);
    const text = isMeaningful(tEn) ? tEn : tOg;
    if (!isMeaningful(text)) continue;
    const startSecond = typeof starts[i] === "number" ? starts[i] : 0;
    const endSecond = typeof ends[i] === "number" ? ends[i] : startSecond;
    out.push({ text, startSecond, endSecond });
  }
  return out;
};

const buildSegmentsFromMsSegments = (segments: unknown): RecordingTranscriptSegment[] => {
  if (!Array.isArray(segments)) return [];
  return segments
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const seg = s as {
        start_ms?: unknown;
        end_ms?: unknown;
        text?: unknown;
        translated_text?: unknown;
        original_text?: unknown;
      };
      const tEn = sanitizeText(seg.translated_text ?? "");
      const tRaw = sanitizeText(seg.text ?? "");
      const tOg = sanitizeText(seg.original_text ?? "");
      const text = isMeaningful(tEn) ? tEn : (isMeaningful(tRaw) ? tRaw : tOg);
      if (!isMeaningful(text)) return null;
      const startMs = typeof seg.start_ms === "number" ? seg.start_ms : 0;
      const endMs = typeof seg.end_ms === "number" ? seg.end_ms : startMs;
      return { text, startSecond: startMs / 1000, endSecond: endMs / 1000 };
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
};

const simplifyInsights = (insights: PythonInsights | null | undefined): RecordingAnalysis => {
  const summary = sanitizeText(insights?.summary);
  const primaryIntent = sanitizeText(insights?.primary_intent);
  const secondaryIntents = asStringArray(insights?.secondary_intents);
  const regulatory = asStringArray(insights?.regulatory_flags);
  const actionItems = asStringArray(insights?.action_items);

  const sentimentRaw = sanitizeText(insights?.sentiment).toLowerCase();
  const sentiment: RecordingAnalysis["sentiment"] =
    sentimentRaw === "positive" || sentimentRaw === "negative" || sentimentRaw === "mixed"
      ? (sentimentRaw as RecordingAnalysis["sentiment"])
      : "neutral";

  const keyPoints: string[] = [];
  if (primaryIntent) keyPoints.push(`Intent: ${primaryIntent}`);
  for (const t of secondaryIntents.slice(0, primaryIntent ? 3 : 4)) {
    keyPoints.push(`Topic: ${t}`);
  }

  const obligations = Array.isArray(insights?.obligations) ? (insights?.obligations as unknown[]) : [];
  for (const ob of obligations.slice(0, 3)) {
    const text = sanitizeText((ob as { text?: unknown })?.text);
    if (isMeaningful(text)) keyPoints.push(`Obligation: ${text}`);
  }

  const entities = Array.isArray(insights?.entities) ? (insights?.entities as unknown[]) : [];
  for (const ent of entities.slice(0, 3)) {
    const type = sanitizeText((ent as { type?: unknown })?.type);
    const value = sanitizeText((ent as { value?: unknown })?.value);
    if (isMeaningful(type) && isMeaningful(value)) keyPoints.push(`${type}: ${value}`);
  }

  for (const flag of regulatory.slice(0, 2)) {
    keyPoints.push(`Flag: ${flag}`);
  }

  const topics = Array.from(new Set([primaryIntent, ...secondaryIntents].filter(Boolean))).slice(0, 8);

  return {
    summary,
    keyPoints: keyPoints.slice(0, 8),
    actionItems: actionItems.slice(0, 8),
    topics,
    sentiment,
  };
};

const analyzeRecordingViaPipeline = async (audioBytes: Uint8Array, fileName: string) => {
  const bytesCopy = new Uint8Array(audioBytes.byteLength);
  bytesCopy.set(audioBytes);

  const top = await runAudioUpdatePipeline({
    audioBytes: bytesCopy,
    fileName,
  });

  const translate = top.translate_output;
  const data =
    translate && typeof translate === "object"
      ? ({
          ...(translate as Record<string, unknown>),
          insights: top.insights,
          ui_spec: top.ui_spec,
        } satisfies Record<string, unknown>)
      : top;

  const transcriptEnglish = sanitizeText(data.transcript_english);
  const transcriptOriginal = sanitizeText(data.transcript);
  const transcriptText = isMeaningful(transcriptEnglish) ? transcriptEnglish : transcriptOriginal;

  const msSegments = buildSegmentsFromMsSegments(data.segments);
  const diarizedSegments = buildSegmentsFromDiarizedEntries(
    (data.diarized_transcript as { entries?: unknown } | undefined)?.entries,
  );
  const timestampSegments = buildSegmentsFromTimestamps(data.timestamps);

  const segments =
    msSegments.length > 0 ? msSegments : diarizedSegments.length > 0 ? diarizedSegments : timestampSegments;

  const durationInSeconds =
    typeof data.duration_s === "number"
      ? data.duration_s
      : segments.reduce((max, s) => Math.max(max, s.endSecond), 0);

  const language =
    typeof data.language_code === "string"
      ? data.language_code
      : typeof data.language === "string"
        ? data.language
        : undefined;

  const analysis = simplifyInsights((data.insights as PythonInsights | null | undefined) ?? undefined);

  return {
    transcriptText,
    segments,
    durationInSeconds,
    language,
    analysis,
  };
};

export async function POST(request: Request) {
  let turnId: string | undefined;
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let userText = "";
    let messages: CoreMessage[] = [];
    let callState: unknown = null;
    let voice: string | undefined;

    let transcriptionMeta:
      | {
          language?: string;
          durationInSeconds?: number;
          segments?: Array<{ text: string; startSecond: number; endSecond: number }>;
        }
      | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audio = formData.get("audio");
      const rawText = formData.get("text");
      const rawMessages = formData.get("messages");
      const rawCallState = formData.get("callState");
      const rawVoice = formData.get("voice");
      const rawTurnId = formData.get("turnId");

      if (typeof rawText === "string") userText = rawText;
      if (typeof rawMessages === "string") {
        messages = normalizeMessages(safeJsonParse(rawMessages));
      }
      if (typeof rawCallState === "string") {
        callState = safeJsonParse(rawCallState);
      }
      if (typeof rawVoice === "string" && rawVoice.trim()) {
        voice = rawVoice.trim();
      }
      if (typeof rawTurnId === "string" && rawTurnId.trim()) {
        turnId = rawTurnId.trim();
        setVoiceTurnProgress(turnId, "received", "Processing");
      }

      if (!userText && audio instanceof File) {
        setVoiceTurnProgress(turnId, "transcribing", "Transcribing");
        const buffer = await audio.arrayBuffer();
        const transcript = await transcribe({
          model: openai.transcription("gpt-4o-mini-transcribe"),
          audio: new Uint8Array(buffer),
        });
        userText = transcript.text ?? "";
        transcriptionMeta = {
          language: transcript.language,
          durationInSeconds: transcript.durationInSeconds,
          segments: transcript.segments,
        };
      }
    } else {
      const body = (await request.json().catch(() => null)) as unknown;
      if (body && typeof body === "object") {
        const b = body as {
          text?: unknown;
          messages?: unknown;
          callState?: unknown;
          voice?: unknown;
          turnId?: unknown;
        };
        if (typeof b.text === "string") userText = b.text;
        messages = normalizeMessages(b.messages);
        callState = b.callState ?? null;
        if (typeof b.voice === "string" && b.voice.trim()) voice = b.voice.trim();
        if (typeof b.turnId === "string" && b.turnId.trim()) {
          turnId = b.turnId.trim();
          setVoiceTurnProgress(turnId, "received", "Processing");
        }
      }
    }

    userText = userText.trim();
    if (!userText) {
      return NextResponse.json(
        { error: "No speech detected. Try again with a longer utterance." },
        { status: 400 },
      );
    }

    setVoiceTurnProgress(turnId, "thinking", "Thinking");
    const activeCallContext = buildActiveCallRecordingContext(callState);
    const system = buildSystemPrompt(callState, activeCallContext);
    const activeRecordingName = activeCallContext?.name;
    const activeRecordingIndex =
      typeof activeCallContext?.index === "number" && activeCallContext.index >= 1
        ? Math.floor(activeCallContext.index)
        : undefined;

    const tools = {
      list_recordings: tool({
        description:
          "List the audio recordings available in the library, in display order. Use this when the user asks what recordings exist.",
        inputSchema: z.object({}),
        execute: async () => {
          setVoiceTurnProgress(turnId, "checking_samples", "Checking Samples");
          const items = await listPublicAudioItems();
          setVoiceTurnProgress(turnId, "thinking", "Thinking");
          return {
            items: items.map((it, i) => ({ index: i + 1, ...it })),
          };
        },
      }),
      query_active_context: tool({
        description:
          "Query the active recording context supplied in call_state (summary, transcript, and segments) for fast answers without re-analyzing library files.",
        inputSchema: z.object({
          query: z.string().optional(),
          topK: z.number().int().min(1).max(8).optional(),
        }),
        execute: async ({ query, topK }) => {
          setVoiceTurnProgress(turnId, "searching_recording", "Searching Recording");
          if (!activeCallContext) {
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return {
              ok: false,
              error:
                "No active recording context in call_state. Ask me to analyze a library recording first.",
            };
          }

          const q = sanitizeText(query);
          const targetK = topK ?? 5;
          const excerpts = q
            ? scoreTranscriptSegments(activeCallContext.segments, q, targetK)
            : activeCallContext.segments.slice(0, targetK).map((seg) => ({
                startSecond: seg.startSecond,
                endSecond: seg.endSecond,
                text: seg.text,
              }));

          const recording = toCachedRecording(activeCallContext);
          setVoiceTurnProgress(turnId, "thinking", "Thinking");
          return {
            ok: true,
            source: "call_state",
            recording: {
              name: recording.name,
              index: recording.index,
              language: recording.transcript.language,
              durationInSeconds: recording.transcript.durationInSeconds,
            },
            analysis: recording.analysis,
            transcriptText: recording.transcript.text,
            query: q || null,
            excerpts,
          };
        },
      }),
      analyze_recording: tool({
        description:
          "Analyze a recording from the library using the configured full-stack pipeline (OPENAI=true uses AI SDK; otherwise it proxies to Python). Accepts either a 1-based index (e.g. 3) or a name (e.g. 'Sample3' or 'Sample3.mp3'). Returns summary + key points and caches the transcript for Q&A.",
        inputSchema: z.object({
          index: z.number().int().min(1).optional(),
          name: z.string().optional(),
          force: z.boolean().optional(),
        }),
        execute: async ({ index, name, force }) => {
          setVoiceTurnProgress(turnId, "performing_analysis", "Performing Analysis");
          const idx = typeof index === "number" ? index : activeRecordingIndex;
          const nm = (name ?? activeRecordingName)?.trim();
          const hasExplicitTarget = typeof index === "number" || Boolean(sanitizeText(name));

          if (!hasExplicitTarget && activeCallContext && !force) {
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return {
              ok: true,
              cached: true,
              source: "call_state",
              recording: toCachedRecording(activeCallContext),
            };
          }

          let picked: Awaited<ReturnType<typeof pickRecording>>;
          try {
            picked = await pickRecording({ index: idx, name: nm });
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to find recording.";
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return { ok: false, error: message };
          }

          const cacheKey = normalizeRecordingKey(picked.item.name);

          if (!force) {
            const cached = recordingCache.get(cacheKey);
            if (cached) {
              setVoiceTurnProgress(turnId, "thinking", "Thinking");
              return { ok: true, cached: true, recording: cached, libraryCount: picked.itemsCount };
            }
          }

          let audioBytes: Uint8Array;
          try {
            audioBytes = await readPublicFileBytes(picked.item.name);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to read the recording file.";
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return { ok: false, error: message };
          }

          let python: Awaited<ReturnType<typeof analyzeRecordingViaPipeline>>;
          try {
            python = await analyzeRecordingViaPipeline(audioBytes, picked.item.name);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to analyze recording.";
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return { ok: false, error: message };
          }

          const recording: CachedRecording = {
            name: picked.item.name,
            url: picked.item.url,
            index: picked.index,
            analyzedAt: new Date().toISOString(),
            transcript: {
              text: python.transcriptText,
              language: python.language,
              durationInSeconds: python.durationInSeconds,
              segments: python.segments,
            },
            analysis: python.analysis,
          };

          recordingCache.set(cacheKey, recording);

          setVoiceTurnProgress(turnId, "thinking", "Thinking");
          return { ok: true, cached: false, recording, libraryCount: picked.itemsCount };
        },
      }),
      get_recording: tool({
        description:
          "Get the cached transcript + analysis for the current recording. Use this if you need to reference details and the recording has already been analyzed.",
        inputSchema: z.object({
          index: z.number().int().min(1).optional(),
          name: z.string().optional(),
        }),
        execute: async ({ index, name }) => {
          setVoiceTurnProgress(turnId, "thinking", "Fetching Recording");
          const idx = typeof index === "number" ? index : activeRecordingIndex;
          const nm = (name ?? activeRecordingName)?.trim();
          const hasExplicitTarget = typeof index === "number" || Boolean(sanitizeText(name));

          if (!hasExplicitTarget && activeCallContext) {
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return {
              ok: true,
              source: "call_state",
              recording: toCachedRecording(activeCallContext),
            };
          }

          if (
            activeCallContext &&
            isTargetingContextRecording(activeCallContext, { index: idx, name: nm })
          ) {
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return {
              ok: true,
              source: "call_state",
              recording: toCachedRecording(activeCallContext),
            };
          }

          try {
            const picked = await pickRecording({ index: idx, name: nm });
            const cacheKey = normalizeRecordingKey(picked.item.name);
            const cached = recordingCache.get(cacheKey);
            if (!cached) {
              setVoiceTurnProgress(turnId, "thinking", "Thinking");
              return {
                ok: false,
                error:
                  "That recording has not been analyzed yet. Ask me to analyze it first (e.g. 'recording 3').",
              };
            }
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return { ok: true, recording: cached };
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to find recording.";
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return { ok: false, error: message };
          }
        },
      }),
      search_recording: tool({
        description:
          "Search within an analyzed recording transcript and return the best matching excerpts with timestamps. Use this to answer detailed questions accurately.",
        inputSchema: z.object({
          query: z.string(),
          topK: z.number().int().min(1).max(8).optional(),
          index: z.number().int().min(1).optional(),
          name: z.string().optional(),
        }),
        execute: async ({ query, topK, index, name }) => {
          setVoiceTurnProgress(turnId, "searching_recording", "Searching Recording");
          const q = query.trim();
          if (!q) {
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return { ok: false, error: "Empty query." };
          }

          const targetK = topK ?? 5;
          const idx = typeof index === "number" ? index : activeRecordingIndex;
          const nm = (name ?? activeRecordingName)?.trim();
          const hasExplicitTarget = typeof index === "number" || Boolean(sanitizeText(name));

          if (
            activeCallContext &&
            (!hasExplicitTarget || isTargetingContextRecording(activeCallContext, { index: idx, name: nm }))
          ) {
            const excerpts = scoreTranscriptSegments(activeCallContext.segments, q, targetK);
            const contextRecording = toCachedRecording(activeCallContext);
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return {
              ok: true,
              source: "call_state",
              recording: {
                name: contextRecording.name,
                url: contextRecording.url,
                index: contextRecording.index,
              },
              query: q,
              excerpts,
            };
          }

          let picked: Awaited<ReturnType<typeof pickRecording>>;
          try {
            picked = await pickRecording({ index: idx, name: nm });
          } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to find recording.";
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return { ok: false, error: message };
          }

          const cacheKey = normalizeRecordingKey(picked.item.name);
          const cached = recordingCache.get(cacheKey);
          if (!cached) {
            setVoiceTurnProgress(turnId, "thinking", "Thinking");
            return {
              ok: false,
              error:
                "That recording has not been analyzed yet. Ask me to analyze it first (e.g. 'recording 3').",
            };
          }

          const response = {
            ok: true,
            recording: { name: cached.name, url: cached.url, index: cached.index },
            query: q,
            excerpts: scoreTranscriptSegments(cached.transcript.segments, q, targetK),
          };
          setVoiceTurnProgress(turnId, "thinking", "Thinking");
          return response;
        },
      }),
    } as const;

    const result = await generateText({
      model: openai("gpt-5-mini"),
      tools,
      stopWhen: stepCountIs(8),
      system,
      messages: [...messages, { role: "user", content: userText }],
      temperature: 0.4,
    });

    const assistant = (result.text ?? "").trim();
    setVoiceTurnProgress(turnId, "generating_speech", "Generating Speech");
    const { audio, warnings } = await generateSpeech({
      model: openai.speech("gpt-4o-mini-tts"),
      text: assistant || " ",
      voice: voice ?? "alloy",
      outputFormat: "mp3",
    });

    // Do not return audio.uint8Array in JSON (it would bloat responses dramatically).
    const audioPayload = {
      base64: audio.base64,
      mediaType: audio.mediaType,
      format: audio.format,
    };

    const toolResults = result.steps.flatMap((s) => s.toolResults);

    return NextResponse.json({
      userText, 
      assistantText: assistant,
      audio: audioPayload,
      warnings,
      toolResults,
      transcription: transcriptionMeta,
    });
  } catch (error) {
    if (NoTranscriptGeneratedError.isInstance(error)) {
      return NextResponse.json(
        { error: "No speech detected. Try again with a longer utterance." },
        { status: 400 },
      );
    }
    if (NoSpeechGeneratedError.isInstance(error)) {
      return NextResponse.json(
        { error: "Failed to generate speech audio for the response." },
        { status: 502 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearVoiceTurnProgress(turnId);
  }
}
