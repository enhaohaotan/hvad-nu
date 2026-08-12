import { NextRequest, NextResponse } from "next/server";
import { FEEDBACK_SCHEMA } from "@/app/hvadsynesdu/ai-schemas";
import { createStructuredResponse } from "@/app/hvadsynesdu/openai";
import { feedbackPrompt } from "@/app/hvadsynesdu/prompts";
import { isLevel } from "@/app/hvadsynesdu/storage";
import type { FeedbackResult, GeneratedContent, LearnerProfile } from "@/app/hvadsynesdu/types";
import { isLearningModel } from "@/app/hvadsynesdu/learning-model";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const apiKey = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!apiKey) return NextResponse.json({ error: "Indtast din OpenAI API-nøgle." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!isLevel(body.level) || !isLevel(body.targetLevel) || !isLearningModel(body.model) || typeof body.answer !== "string" || !body.answer.trim()) {
      return NextResponse.json({ error: "Skriv et svar og vælg et gyldigt niveau og en gyldig model." }, { status: 400 });
    }
    const feedback = await createStructuredResponse<FeedbackResult>({
      apiKey,
      model: body.model,
      prompt: feedbackPrompt({
        level: body.level,
        targetLevel: body.targetLevel,
        content: body.content as GeneratedContent,
        profile: body.profile as LearnerProfile,
        previousTurns: Array.isArray(body.previousTurns) ? body.previousTurns.slice(-6) as Array<{ userAnswer: string; reply: string }> : [],
        answer: body.answer.slice(0, 6_000),
      }),
      schemaName: "danish_learning_feedback",
      schema: FEEDBACK_SCHEMA,
      signal: request.signal,
      maxOutputTokens: 10_000,
    });
    return NextResponse.json({ feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Svaret kunne ikke behandles.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
