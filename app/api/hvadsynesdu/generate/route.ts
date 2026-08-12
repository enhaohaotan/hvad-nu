import { NextRequest, NextResponse } from "next/server";
import { CONTENT_SCHEMA } from "@/app/hvadsynesdu/ai-schemas";
import { createStructuredResponse } from "@/app/hvadsynesdu/openai";
import { contentPrompt } from "@/app/hvadsynesdu/prompts";
import { isLevel } from "@/app/hvadsynesdu/storage";
import type { GeneratedContent } from "@/app/hvadsynesdu/types";
import { isLearningModel } from "@/app/hvadsynesdu/learning-model";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const apiKey = bearer(request);
  if (!apiKey) return NextResponse.json({ error: "Indtast din OpenAI API-nøgle." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!isLevel(body.level) || !isLevel(body.targetLevel) || !isLearningModel(body.model)) {
      return NextResponse.json({ error: "Vælg et gyldigt niveau og en gyldig model." }, { status: 400 });
    }
    const recentTopics = Array.isArray(body.recentTopics)
      ? body.recentTopics.filter((item): item is string => typeof item === "string").slice(0, 10)
      : [];
    const content = await createStructuredResponse<GeneratedContent>({
      apiKey,
      model: body.model,
      prompt: contentPrompt({ level: body.level, targetLevel: body.targetLevel, recentTopics }),
      schemaName: "danish_learning_session",
      schema: CONTENT_SCHEMA,
      signal: request.signal,
      useWebSearch: true,
      maxOutputTokens: 16_000,
    });
    return NextResponse.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sessionen kunne ikke oprettes.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function bearer(request: NextRequest) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : "";
}
