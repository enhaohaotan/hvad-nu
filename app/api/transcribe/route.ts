import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_TRANSCRIPTION_MODE,
  isTranscriptionMode,
  type TranscriptionMode,
} from "@/lib/transcription-mode";
import {
  runTranscription,
  safeErrorMessage,
  safeErrorDebug,
} from "@/lib/transcription-server";

export const dynamic = "force-dynamic";
// Vercel Hobby with Fluid Compute supports up to five minutes per invocation.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const apiKey = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!apiKey) {
    return errorResponse("Indtast din OpenAI API-nøgle.", 401);
  }

  let drUrl = "";
  let mode: TranscriptionMode = DEFAULT_TRANSCRIPTION_MODE;
  try {
    const body = (await request.json()) as { url?: unknown; mode?: unknown };
    drUrl = typeof body.url === "string" ? body.url : "";
    if (body.mode !== undefined) {
      if (typeof body.mode !== "string" || !isTranscriptionMode(body.mode)) {
        return errorResponse("Vælg en gyldig transskriptionsmetode.", 400);
      }
      mode = body.mode;
    }
  } catch {
    return errorResponse("Anmodningen om transskription kunne ikke læses.", 400);
  }

  if (!drUrl) {
    return errorResponse("Der skal bruges en URL til en DR LYD-episode.", 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const emit = (event: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15_000);

      void runTranscription({ drUrl, apiKey, mode, signal: request.signal, emit })
        .catch((error) => {
          if (!request.signal.aborted) {
            emit({
              type: "companion.error",
              message: safeErrorMessage(error),
              debug: safeErrorDebug(error),
            });
          }
        })
        .finally(() => {
          clearInterval(heartbeat);
          closed = true;
          try {
            controller.close();
          } catch {
            // The browser may have already closed the stream.
          }
        });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
