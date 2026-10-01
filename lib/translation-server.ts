import { TRANSLATION_LANGUAGES, type TranslationLanguage } from "./translation.ts";

export const TRANSLATION_MODEL = "gpt-5.6-luna";
export type SourceSentence = { id: number; text: string };

export async function translateTranscript(
  sentences: SourceSentence[],
  targetLanguage: TranslationLanguage,
  apiKey: string,
  signal: AbortSignal,
): Promise<string[]> {
  const languageName = TRANSLATION_LANGUAGES[targetLanguage];
  const translationKeys = sentences.map((sentence) => `s${sentence.id}`);
  const translationProperties = Object.fromEntries(
    translationKeys.map((key) => [key, { type: "string" }]),
  );
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TRANSLATION_MODEL,
      store: false,
      reasoning: { effort: "none" },
      instructions: [
        `Translate the complete Danish podcast transcript into ${languageName}.`,
        "Use the entire transcript as shared context so references, names, tone, and ambiguous phrases stay consistent.",
        "Return one natural translation for every input sentence under its matching s-prefixed ID. Preserve meaning and do not summarize, omit, merge, or add information.",
      ].join(" "),
      input: JSON.stringify(sentences),
      text: {
        format: {
          type: "json_schema",
          name: "transcript_translation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              translations: {
                type: "object",
                properties: translationProperties,
                required: translationKeys,
                additionalProperties: false,
              },
            },
            required: ["translations"],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: Math.min(
        128_000,
        Math.max(2_000, Math.ceil(sourceLength(sentences) * 0.9)),
      ),
    }),
    signal,
  });

  const body = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!response.ok || !body) {
    const providerError = body?.error as { message?: string } | undefined;
    throw new Error(
      providerError?.message || "OpenAI kunne ikke oversætte transskriptionen.",
    );
  }

  const outputText = extractOutputText(body);
  const parsed = JSON.parse(outputText) as {
    translations?: Record<string, unknown>;
  };
  const translations = sentences.map((sentence) => {
    const value = parsed.translations?.[`s${sentence.id}`];
    return typeof value === "string" ? value.trim() : "";
  });
  if (translations.some((translation) => !translation)) {
    throw new Error("OpenAI returnerede ikke en oversættelse for hver sætning.");
  }
  return translations;
}

function extractOutputText(body: Record<string, unknown>): string {
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content: unknown[] }).content ?? [])
      : [];
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  throw new Error("OpenAI returnerede ikke et læsbart oversættelsessvar.");
}

function sourceLength(sentences: SourceSentence[]): number {
  return sentences.reduce((total, sentence) => total + sentence.text.length, 0);
}
