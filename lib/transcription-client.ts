import type { TimedSentence } from "@/lib/timed-transcript";
import type { TranscriptionMode } from "@/lib/transcription-mode";

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

export type TranscriptionResult = {
  text: string;
  sentences: TimedSentence[];
};

export async function transcribeEpisode({
  url,
  apiKey,
  mode,
  signal,
  onProgress,
  onTranscript,
  onTimedSentences,
}: {
  url: string;
  apiKey: string;
  mode: TranscriptionMode;
  signal: AbortSignal;
  onProgress: (event: ProgressEvent) => void;
  onTranscript: (value: string) => void;
  onTimedSentences: (value: TimedSentence[]) => void;
}): Promise<TranscriptionResult> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, mode }),
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
  let finalSentences: TimedSentence[] = [];
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
        sentences?: unknown;
      };
      if (event.type === "transcript.text.delta" && event.delta) {
        accumulated += event.delta;
        onTranscript(accumulated);
      } else if (event.type === "companion.transcript" && event.text) {
        accumulated = event.text;
        onTranscript(accumulated);
        const sentences = parseTimedSentences(event.sentences);
        if (sentences.length > 0) {
          finalSentences = sentences;
          onTimedSentences(sentences);
        }
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
        const sentences = parseTimedSentences(event.sentences);
        if (sentences.length > 0) {
          finalSentences = sentences;
          onTimedSentences(sentences);
        }
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

  return {
    text: (finalText || accumulated).trim(),
    sentences: finalSentences,
  };
}

function parseTimedSentences(value: unknown): TimedSentence[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (sentence): sentence is TimedSentence =>
      typeof sentence === "object" &&
      sentence !== null &&
      typeof (sentence as TimedSentence).text === "string" &&
      typeof (sentence as TimedSentence).start === "number" &&
      Number.isFinite((sentence as TimedSentence).start) &&
      typeof (sentence as TimedSentence).end === "number" &&
      Number.isFinite((sentence as TimedSentence).end) &&
      (sentence as TimedSentence).end >= (sentence as TimedSentence).start,
  );
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
