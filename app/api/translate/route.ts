import {
  translateTranscript,
  TRANSLATION_MODEL,
  type SourceSentence,
} from "@/lib/translation-server";
import { NextRequest, NextResponse } from "next/server";
import { isTranslationLanguage } from "@/lib/translation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_SENTENCES = 4_000;
const MAX_SOURCE_CHARACTERS = 400_000;
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const apiKey = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Indtast din OpenAI API-nøgle for at oversætte." },
      { status: 401 },
    );
  }

  let sentences: SourceSentence[] = [];
  let targetLanguage = "";
  try {
    const body = (await request.json()) as {
      sentences?: unknown;
      targetLanguage?: unknown;
    };
    targetLanguage =
      typeof body.targetLanguage === "string" ? body.targetLanguage : "";
    if (Array.isArray(body.sentences)) {
      sentences = body.sentences.filter(
        (item): item is SourceSentence =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as SourceSentence).id === "number" &&
          typeof (item as SourceSentence).text === "string" &&
          Boolean((item as SourceSentence).text.trim()),
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Oversættelsesanmodningen kunne ikke læses." },
      { status: 400 },
    );
  }

  if (!isTranslationLanguage(targetLanguage) || sentences.length === 0) {
    return NextResponse.json(
      { error: "Vælg et gyldigt sprog og en transskription." },
      { status: 400 },
    );
  }
  const sourceCharacters = sentences.reduce(
    (total, sentence) => total + sentence.text.length,
    0,
  );
  if (
    sentences.length > MAX_SENTENCES ||
    sourceCharacters > MAX_SOURCE_CHARACTERS
  ) {
    return NextResponse.json(
      { error: "Transskriptionen er for lang til at blive oversat på én gang." },
      { status: 413 },
    );
  }

  try {
    const translations = await translateTranscript(
      sentences,
      targetLanguage,
      apiKey,
      request.signal,
    );
    return NextResponse.json({ translations, model: TRANSLATION_MODEL });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Transskriptionen kunne ikke oversættes.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
