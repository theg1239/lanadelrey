import { NextResponse } from "next/server";
import { listPublicAudioItems } from "@/lib/library-audio";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const items = await listPublicAudioItems();
        return NextResponse.json({ items });
    } catch {
        return NextResponse.json(
            { error: "Failed to read public audio directory" },
            { status: 500 }
        );
    }
}
