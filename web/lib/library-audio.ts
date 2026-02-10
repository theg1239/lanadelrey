import { readdir, readFile, stat } from "fs/promises";
import path from "path";

export type PublicAudioItem = {
  name: string;
  url: string;
  size: number;
  modifiedAt: string;
};

const AUDIO_EXTENSIONS = new Set([
  ".wav",
  ".mp3",
  ".mpeg",
  ".ogg",
  ".flac",
  ".webm",
  ".mp4",
  ".m4a",
  ".aac",
  ".opus",
]);

export function isAudioFileName(fileName: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function assertSafePublicFileName(fileName: string): string {
  const base = path.basename(fileName);
  if (base !== fileName) throw new Error("Invalid file name.");
  if (base.includes("..")) throw new Error("Invalid file name.");
  return base;
}

function getPublicDir(cwd = process.cwd()): string {
  return path.join(cwd, "public");
}

export async function listPublicAudioItems(cwd = process.cwd()): Promise<PublicAudioItem[]> {
  const publicDir = getPublicDir(cwd);
  const entries = await readdir(publicDir, { withFileTypes: true });
  const audioFiles = entries.filter((entry) => entry.isFile() && isAudioFileName(entry.name));

  const items = await Promise.all(
    audioFiles.map(async (entry) => {
      const fullPath = path.join(publicDir, entry.name);
      const details = await stat(fullPath);
      return {
        name: entry.name,
        url: `/${encodeURIComponent(entry.name)}`,
        size: details.size,
        modifiedAt: details.mtime.toISOString(),
      } satisfies PublicAudioItem;
    }),
  );

  items.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );

  return items;
}

export async function readPublicFileBytes(
  fileName: string,
  cwd = process.cwd(),
): Promise<Uint8Array> {
  const safeName = assertSafePublicFileName(fileName);
  const fullPath = path.join(getPublicDir(cwd), safeName);
  const buf = await readFile(fullPath);
  return new Uint8Array(buf);
}

