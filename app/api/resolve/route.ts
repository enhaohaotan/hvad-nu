import { NextRequest, NextResponse } from "next/server";
import { resolveDrEpisode } from "@/lib/dr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url") ?? "";

  try {
    const episode = await resolveDrEpisode(value, request.signal);
    return NextResponse.json(
      { episode },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Episoden kunne ikke findes.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
