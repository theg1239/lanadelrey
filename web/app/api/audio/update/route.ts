import { NextResponse } from "next/server";

import { runAudioUpdatePipeline } from "@/lib/server/audio-update";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { detail: "Missing 'audio' file in multipart form-data" },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await audio.arrayBuffer());
    const fileName = audio.name?.trim() || "input.wav";

    const payload = await runAudioUpdatePipeline({
      audioBytes: bytes,
      fileName,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

