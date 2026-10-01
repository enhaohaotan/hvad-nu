import { resolveDrEpisode, type DrEpisode } from "./dr.ts";
import { MAX_CHUNK_BYTES, splitMp3 } from "./mp3.ts";
import { mergeTranscriptParts } from "./transcript-text.ts";
import {
  alignTranscriptToTimedWords,
  applyTranscriptPunctuation,
  mergeTimedWords,
  timedSentencesToText,
  timedWordsToSentences,
  type TimedWord,
} from "./timed-transcript.ts";
import type { TranscriptionMode } from "./transcription-mode.ts";

const MAX_AUDIO_BYTES = 400_000_000;

type ProgressPhase = "downloading" | "preparing" | "transcribing";

export async function runTranscription({
  drUrl,
  resolvedEpisode,
  apiKey,
  mode,
  signal,
  emit,
}: {
  drUrl: string;
  resolvedEpisode?: DrEpisode;
  apiKey: string;
  mode: TranscriptionMode;
  signal: AbortSignal;
  emit: (event: Record<string, unknown>) => void;
}) {
  emitProgress(emit, "downloading", "Finder episoden i DR LYDs RSS-feed…", 0);
  const episode = resolvedEpisode ?? await resolveDrEpisode(drUrl, signal);
  const audio = await downloadAudio(
    episode.audioUrl,
    episode.sourceUrl,
    signal,
    (progress) => {
      emitProgress(
        emit,
        "downloading",
        "Downloader episoden fra DR LYD…",
        progress * 0.35,
      );
    },
  );

  emitProgress(emit, "preparing", "Opdeler den oprindelige MP3-fil i dele på cirka ti minutter…", 36);
  const chunks = splitMp3(audio);

  let completedWords: TimedWord[] = [];
  let completedText = "";
  let context = "";
  let chunkOffset = 0;
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const baseProgress = 40 + (index / chunks.length) * 58;
    emitProgress(
      emit,
      "transcribing",
      `Transskriberer del ${index + 1} af ${chunks.length}…`,
      baseProgress,
    );

    if (mode === "gpt") {
      const text = await transcribeGptChunk({
        chunk: chunk.blob,
        index,
        apiKey,
        prompt: context,
        signal,
      });
      completedText = mergeTranscriptParts(completedText, text);
      context = completedText.slice(-500);
      emit({ type: "companion.transcript", text: completedText, sentences: [] });
    } else {
      const [gptText, whisperResult] = await Promise.all([
        mode === "dual"
          ? transcribeGptChunk({
              chunk: chunk.blob,
              index,
              apiKey,
              prompt: context,
              signal,
            })
          : Promise.resolve(""),
        transcribeWhisperChunk({
          chunk: chunk.blob,
          index,
          apiKey,
          prompt: context,
          signal,
        }),
      ]);
      const chunkWords =
        mode === "dual"
          ? alignTranscriptToTimedWords(gptText, whisperResult.words)
          : whisperResult.words;
      const offsetWords = chunkWords.map((word) => ({
        ...word,
        start: word.start + chunkOffset,
        end: word.end + chunkOffset,
      }));
      completedWords = mergeTimedWords(completedWords, offsetWords);
      const sentences = timedWordsToSentences(completedWords);
      completedText = timedSentencesToText(sentences);
      context = completedText.slice(-500);
      emit({
        type: "companion.transcript",
        text: completedText,
        sentences,
      });
    }
    chunkOffset += chunk.durationSeconds;
    emitProgress(
      emit,
      "transcribing",
      `Del ${index + 1} af ${chunks.length} er transskriberet`,
      40 + ((index + 1) / chunks.length) * 58,
    );
  }

  const sentences = mode === "gpt" ? [] : timedWordsToSentences(completedWords);
  emit({
    type: "companion.done",
    text: mode === "gpt" ? completedText : timedSentencesToText(sentences),
    sentences,
    progress: 100,
  });
  return { text: mode === "gpt" ? completedText : timedSentencesToText(sentences), sentences };
}

async function downloadAudio(
  url: string,
  sourceUrl: string,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    headers: {
      Accept:
        "audio/mpeg, audio/*;q=0.9, application/octet-stream;q=0.8, */*;q=0.5",
      "Accept-Language": "da-DK,da;q=0.9,en;q=0.5",
      Referer: sourceUrl,
      // Some podcast/CDN gateways reject anonymous server-runtime clients.
      // Identify this as a podcast download instead of relying on Node's UA.
      "User-Agent": "HvadSagdeDe/0.1 (DR LYD podcast transcription)",
    },
  });
  if (!response.ok || !response.body) {
    const region = process.env.VERCEL_REGION || "local";
    console.error("DR audio download failed", {
      status: response.status,
      statusText: response.statusText,
      region,
      redirected: response.redirected,
      host: safeHost(response.url || url),
    });
    throw new DrAudioDownloadError(
      "Lyden til episoden kunne ikke downloades fra DR LYD.",
      [
        `Tidspunkt: ${new Date().toISOString()}`,
        `Vercel-region: ${region}`,
        `HTTP-status: ${response.status} ${response.statusText}`.trim(),
        `Viderestillet til CDN: ${response.redirected ? "ja" : "nej"}`,
        `Svar-vært: ${safeHost(response.url || url)}`,
      ].join("\n"),
    );
  }

  const total = Number(response.headers.get("content-length")) || 0;
  if (total > MAX_AUDIO_BYTES) {
    throw new Error("Episoden er for stor til denne første version.");
  }

  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let received = 0;
  let lastReported = -1;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.byteLength;

    if (received > MAX_AUDIO_BYTES) {
      await reader.cancel();
      throw new Error("Episoden er for stor til denne første version.");
    }

    if (total) {
      const progress = Math.floor((received / total) * 100);
      if (progress !== lastReported) {
        lastReported = progress;
        onProgress(Math.min(100, progress));
      }
    }
  }

  return new Blob(parts as BlobPart[], { type: "audio/mpeg" }).arrayBuffer();
}

async function transcribeWhisperChunk({
  chunk,
  index,
  apiKey,
  prompt,
  signal,
}: {
  chunk: Blob;
  index: number;
  apiKey: string;
  prompt: string;
  signal: AbortSignal;
}): Promise<{ text: string; words: TimedWord[] }> {
  if (chunk.size > MAX_CHUNK_BYTES) {
    throw new Error("En lyddel overskred sikkerhedsgrænsen på 24 MB.");
  }

  const form = new FormData();
  form.set(
    "file",
    chunk,
    `dr-episode-${String(index + 1).padStart(2, "0")}.mp3`,
  );
  form.set("model", "whisper-1");
  form.set("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.set("language", "da");
  if (prompt) form.set("prompt", prompt);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: form,
    signal,
  });

  if (!response.ok) {
    throw await openAiError(response, index, "whisper-1");
  }
  const body = (await response.json()) as {
    text?: unknown;
    words?: unknown;
  };
  const words = Array.isArray(body.words)
    ? body.words.filter(
        (word): word is TimedWord =>
          typeof word === "object" &&
          word !== null &&
          typeof (word as TimedWord).word === "string" &&
          typeof (word as TimedWord).start === "number" &&
          typeof (word as TimedWord).end === "number",
      )
    : [];
  if (words.length === 0) {
    throw new Error("OpenAI returnerede ingen tidskoder for denne lyddel.");
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  return { text, words: applyTranscriptPunctuation(text, words) };
}

async function transcribeGptChunk({
  chunk,
  index,
  apiKey,
  prompt,
  signal,
}: {
  chunk: Blob;
  index: number;
  apiKey: string;
  prompt: string;
  signal: AbortSignal;
}): Promise<string> {
  if (chunk.size > MAX_CHUNK_BYTES) {
    throw new Error("En lyddel overskred sikkerhedsgrænsen på 24 MB.");
  }

  const form = new FormData();
  form.set(
    "file",
    chunk,
    `dr-episode-${String(index + 1).padStart(2, "0")}.mp3`,
  );
  form.set("model", "gpt-transcribe");
  form.set("response_format", "json");
  form.append("languages[]", "da");
  if (prompt) form.set("prompt", prompt);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: form,
    signal,
  });
  if (!response.ok) {
    throw await openAiError(response, index, "gpt-transcribe");
  }
  const body = (await response.json()) as { text?: unknown };
  if (typeof body.text !== "string" || !body.text.trim()) {
    throw new Error("OpenAI returnerede ingen tekst for denne lyddel.");
  }
  return body.text.trim();
}

function emitProgress(
  emit: (event: Record<string, unknown>) => void,
  phase: ProgressPhase,
  message: string,
  progress: number,
) {
  emit({ type: "companion.progress", phase, message, progress });
}

class OpenAiTranscriptionError extends Error {
  readonly debug: string;

  constructor(message: string, debug: string) {
    super(message);
    this.debug = debug;
    this.name = "OpenAiTranscriptionError";
  }
}

class DrAudioDownloadError extends Error {
  readonly debug: string;

  constructor(message: string, debug: string) {
    super(message);
    this.debug = debug;
    this.name = "DrAudioDownloadError";
  }
}

async function openAiError(
  response: Response,
  chunkIndex: number,
  model: string,
): Promise<OpenAiTranscriptionError> {
  const status = response.status;
  let message = "OpenAI kunne ikke transskribere denne lyddel. Prøv igen.";
  if (status === 401 || status === 403) {
    message = "OpenAI afviste API-nøglen. Kontrollér den, og prøv igen.";
  } else if (status === 429) {
    message = "OpenAI’s hastighedsgrænse blev nået. Vent et øjeblik, og prøv igen.";
  } else if (status === 413) {
    message = "OpenAI afviste lydfilens størrelse.";
  }

  let rawError = "";
  try {
    rawError = (await response.text()).trim();
  } catch {
    // The HTTP status remains available if the response body cannot be read.
  }
  const rawDetail = rawError || response.statusText || "Intet fejlsvar";
  return new OpenAiTranscriptionError(
    message,
    [
      `Tidspunkt: ${new Date().toISOString()}`,
      `Model: ${model}`,
      `Lyddel: ${chunkIndex + 1}`,
      `HTTP-status: ${status} ${response.statusText}`.trim(),
      "OpenAI-svar:",
      rawDetail,
    ].join("\n"),
  );
}

export function safeErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Episoden kunne ikke transskriberes.";
}

export function safeErrorDebug(error: unknown): string | undefined {
  return error instanceof OpenAiTranscriptionError ||
    error instanceof DrAudioDownloadError
    ? error.debug
    : undefined;
}

function safeHost(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "ukendt";
  }
}
