import "server-only";

export type VoiceTurnProgress = {
  statusKey:
    | "idle"
    | "received"
    | "transcribing"
    | "thinking"
    | "checking_samples"
    | "performing_analysis"
    | "searching_recording"
    | "generating_speech"
    | "done"
    | "error";
  label: string;
  updatedAt: number;
};

const TURN_PROGRESS_TTL_MS = 2 * 60 * 1000;

const globalForProgress = globalThis as unknown as {
  __geoGoodVoiceTurnProgress?: Map<string, VoiceTurnProgress>;
};

const progressMap =
  globalForProgress.__geoGoodVoiceTurnProgress ??
  (globalForProgress.__geoGoodVoiceTurnProgress = new Map<string, VoiceTurnProgress>());

const cleanupStale = () => {
  const now = Date.now();
  for (const [turnId, entry] of progressMap.entries()) {
    if (now - entry.updatedAt > TURN_PROGRESS_TTL_MS) {
      progressMap.delete(turnId);
    }
  }
};

export const setVoiceTurnProgress = (
  turnId: string | null | undefined,
  statusKey: VoiceTurnProgress["statusKey"],
  label: string,
) => {
  if (!turnId) return;
  cleanupStale();
  progressMap.set(turnId, { statusKey, label, updatedAt: Date.now() });
};

export const getVoiceTurnProgress = (
  turnId: string | null | undefined,
): VoiceTurnProgress | null => {
  if (!turnId) return null;
  cleanupStale();
  const entry = progressMap.get(turnId);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TURN_PROGRESS_TTL_MS) {
    progressMap.delete(turnId);
    return null;
  }
  return entry;
};

export const clearVoiceTurnProgress = (turnId: string | null | undefined) => {
  if (!turnId) return;
  progressMap.delete(turnId);
};

