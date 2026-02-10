import { readdir, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

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

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const publicDir = path.join(process.cwd(), "public");
        const entries = await readdir(publicDir, { withFileTypes: true });
        const audioFiles = entries.filter((entry) => (
            entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
        ));

        const items = await Promise.all(audioFiles.map(async (entry) => {
            const fullPath = path.join(publicDir, entry.name);
            const details = await stat(fullPath);
            return {
                name: entry.name,
                url: `/${encodeURIComponent(entry.name)}`,
                size: details.size,
                modifiedAt: details.mtime.toISOString(),
            };
        }));

        items.sort((a, b) => a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
        }));

        return NextResponse.json({ items });
    } catch {
        return NextResponse.json(
            { error: "Failed to read public audio directory" },
            { status: 500 }
        );
    }
}
