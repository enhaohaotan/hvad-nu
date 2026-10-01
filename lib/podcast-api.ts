import { createHash, timingSafeEqual } from "node:crypto";
import { parseDrEpisodeUrl, resolveDrEpisode, resolveLatestDrEpisode } from "./dr.ts";
import { PODCAST_CATALOG } from "./podcast-catalog.ts";
import { runTranscription } from "./transcription-server.ts";
import { isTranslationLanguage, type TranslationLanguage } from "./translation.ts";
import { translateTranscript, type SourceSentence } from "./translation-server.ts";

const MAX_REQUEST_BYTES = 16_384;
const MAX_TRANSLATIONS = 3;
const TRANSLATION_BATCH_CHARACTERS = 12_000;
const REQUEST_TIMEOUT_MS = 280_000;

type Configuration = { accessToken?: string; openAiKey?: string };
type PodcastInput = { name: string; url?: string; translations: TranslationLanguage[] };

class InputError extends Error {}

export async function handlePodcastRequest(request: Request, config: Configuration): Promise<Response> {
  if (!config.accessToken?.trim()) {
    return errorResponse(503, "not_configured", "The podcast API is not configured.");
  }
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match || !tokensMatch(match[1], config.accessToken.trim())) {
    return errorResponse(401, "unauthorized", "A valid podcast API token is required.");
  }
  if (!config.openAiKey?.trim()) {
    return errorResponse(503, "not_configured", "The podcast API is not configured.");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return errorResponse(415, "unsupported_media_type", "Use Content-Type: application/json.");
  }

  let input: PodcastInput;
  try {
    input = validateInput(await readJson(request));
  } catch (error) {
    return errorResponse(400, "invalid_request", error instanceof InputError ? error.message : "The request must contain valid JSON.");
  }

  const show = PODCAST_CATALOG.get(input.name.toLowerCase())!;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
  let stage = "resolve";
  try {
    const episode = input.url
      ? await resolveDrEpisode(input.url, signal)
      : await resolveLatestDrEpisode(show.referenceUrl, signal);
    stage = "transcribe";
    const { text } = await runTranscription({
      drUrl: episode.sourceUrl,
      resolvedEpisode: episode,
      apiKey: config.openAiKey.trim(),
      mode: "gpt",
      signal,
      emit: () => {},
    });
    stage = "translate";
    const translations = [];
    for (const language of input.translations) {
      const fields = [episode.episodeTitle, episode.description, text];
      const translatedFields: string[][] = [[], [], []];
      let batch: SourceSentence[] = [];
      let destinations: number[] = [];
      let characters = 0;
      const flush = async () => {
        if (!batch.length) return;
        const translated = await translateTranscript(batch, language, config.openAiKey!.trim(), signal);
        translated.forEach((value, index) => translatedFields[destinations[index]].push(value));
        batch = [];
        destinations = [];
        characters = 0;
      };
      for (const [fieldIndex, field] of fields.entries()) {
        for (const part of splitTranslationText(field)) {
          if (characters + part.length > TRANSLATION_BATCH_CHARACTERS) await flush();
          batch.push({ id: batch.length, text: part });
          destinations.push(fieldIndex);
          characters += part.length;
        }
      }
      await flush();
      translations.push({
        language,
        title: translatedFields[0].join("\n\n"),
        description: translatedFields[1].join("\n\n"),
        transcript: translatedFields[2].join("\n\n"),
      });
    }
    return jsonResponse({
      name: episode.showTitle,
      title: episode.episodeTitle,
      description: episode.description,
      transcript: text,
      translations,
    });
  } catch {
    // Provider responses can contain sensitive details. Never return or log them here.
    if (signal.aborted) {
      return errorResponse(504, "request_timeout", "Processing was cancelled or timed out. No result was stored.");
    }
    return errorResponse(502, `${stage}_failed`, `Podcast ${stage} failed. No result was stored.`);
  }
}

function tokensMatch(supplied: string, expected: string): boolean {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(supplied), hash(expected));
}

async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("A JSON body is required.");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new InputError("The request body exceeds 16 KiB.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}

function validateInput(value: unknown): PodcastInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError("The body must be a JSON object.");
  }
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["name", "url", "translations"].includes(key))) {
    throw new InputError("Only name, url, and translations are supported. Source language is always Danish.");
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new InputError("name is required.");
  }
  const name = body.name.trim();
  const show = PODCAST_CATALOG.get(name.toLowerCase());
  if (!show) throw new InputError("Unknown podcast. Supported names: Genstart.");
  let url: string | undefined;
  if (body.url !== undefined) {
    if (typeof body.url !== "string" || !body.url.trim()) {
      throw new InputError("url must be a non-empty DR episode URL, or omitted for the latest episode.");
    }
    try {
      const parsed = parseDrEpisodeUrl(body.url);
      const location = new URL(parsed.sourceUrl);
      if (parsed.showSlug !== show.slug || location.username || location.password || location.port) {
        throw new Error("Invalid episode location");
      }
      url = parsed.sourceUrl;
    } catch {
      throw new InputError("url must be an HTTPS DR episode URL for the named podcast.");
    }
  }
  const translations = body.translations ?? [];
  if (body.translations === null || !Array.isArray(translations) || translations.some((language) => typeof language !== "string" || !isTranslationLanguage(language))) {
    throw new InputError("translations must be an array of supported language codes, such as [\"zh\", \"en\"].");
  }
  const uniqueLanguages = [...new Set(translations)] as TranslationLanguage[];
  if (uniqueLanguages.length > MAX_TRANSLATIONS) throw new InputError("At most three translation languages are supported per request.");
  return { name, url, translations: uniqueLanguages };
}

function* splitTranslationText(text: string): Generator<string> {
  let remaining = text.trim();
  while (remaining.length > TRANSLATION_BATCH_CHARACTERS) {
    const window = remaining.slice(0, TRANSLATION_BATCH_CHARACTERS);
    const boundary = window.lastIndexOf(" ");
    const end = boundary > TRANSLATION_BATCH_CHARACTERS / 2 ? boundary : TRANSLATION_BATCH_CHARACTERS;
    yield remaining.slice(0, end);
    remaining = remaining.slice(end).trimStart();
  }
  if (remaining) yield remaining;
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse({ error: { code, message } }, status);
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
    },
  });
}
