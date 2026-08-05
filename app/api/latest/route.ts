import { NextRequest, NextResponse } from "next/server";
import { resolveLatestDrEpisode } from "@/lib/dr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url") ?? "";

  try {
    const episode = await resolveLatestDrEpisode(value, request.signal);
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
            : "Den seneste episode kunne ikke findes.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
