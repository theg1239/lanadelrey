import { NextResponse } from "next/server";
import { getVoiceTurnProgress } from "@/lib/voice-agent-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const turnId = searchParams.get("turnId");

  const progress = getVoiceTurnProgress(turnId);

  return NextResponse.json(
    progress ?? { statusKey: "idle", label: "", updatedAt: 0 },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

