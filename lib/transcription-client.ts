export type TranscriptionPhase =
  | "idle"
  | "resolving"
  | "ready"
  | "downloading"
  | "preparing"
  | "transcribing"
  | "done"
  | "error";

type ProgressEvent = {
  phase: "downloading" | "preparing" | "transcribing";
  message: string;
  progress: number;
};

export async function transcribeEpisode({
  url,
  apiKey,
  signal,
  onProgress,
  onTranscript,
}: {
  url: string;
  apiKey: string;
  signal: AbortSignal;
  onProgress: (event: ProgressEvent) => void;
  onTranscript: (value: string) => void;
}): Promise<string> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
    signal,
  });

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || "Episoden kunne ikke transskriberes.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finalText = "";
  let streamError = "";
  let streamErrorDebug = "";

  function consume(block: string) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;

    try {
      const event = JSON.parse(data) as {
        type?: string;
        delta?: string;
        text?: string;
        message?: string;
        debug?: string;
        phase?: ProgressEvent["phase"];
        progress?: number;
      };
      if (event.type === "transcript.text.delta" && event.delta) {
        accumulated += event.delta;
        onTranscript(accumulated);
      } else if (
        event.type === "companion.progress" &&
        event.phase &&
        event.message
      ) {
        onProgress({
          phase: event.phase,
          message: event.message,
          progress: event.progress ?? 0,
        });
      } else if (event.type === "companion.done" && event.text) {
        finalText = event.text;
        onTranscript(finalText);
      } else if (event.type === "companion.error") {
        streamError =
          event.message || "Episoden kunne ikke transskriberes.";
        streamErrorDebug = event.debug || "";
      }
    } catch {
      // Ignore non-JSON heartbeat or provider metadata events.
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(consume);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);

  if (streamError) {
    throw new TranscriptionRequestError(streamError, streamErrorDebug);
  }

  return (finalText || accumulated).trim();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Noget gik galt. Prøv igen.";
}

class TranscriptionRequestError extends Error {
  constructor(message: string, readonly debug: string) {
    super(message);
    this.name = "TranscriptionRequestError";
  }
}

export function errorDebugMessage(error: unknown): string {
  return error instanceof TranscriptionRequestError ? error.debug : "";
}
