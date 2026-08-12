export const LEARNING_MODEL = "gpt-5.6";

export async function createStructuredResponse<T>(input: {
  apiKey: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  signal: AbortSignal;
  useWebSearch?: boolean;
  maxOutputTokens?: number;
}): Promise<T> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LEARNING_MODEL,
      store: false,
      reasoning: { effort: input.useWebSearch ? "low" : "none" },
      input: input.prompt,
      ...(input.useWebSearch
        ? { tools: [{ type: "web_search", search_context_size: "medium" }] }
        : {}),
      text: {
        format: {
          type: "json_schema",
          name: input.schemaName,
          strict: true,
          schema: input.schema,
        },
      },
      max_output_tokens: input.maxOutputTokens ?? 12_000,
    }),
    signal: input.signal,
  });
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !body) {
    const providerError = body?.error as { message?: string } | undefined;
    throw new Error(providerError?.message || "OpenAI kunne ikke oprette sessionen.");
  }
  if (body.status === "incomplete") throw new Error("OpenAI-svaret blev afbrudt, før det var færdigt.");
  return JSON.parse(extractOutputText(body)) as T;
}

function extractOutputText(body: Record<string, unknown>): string {
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && (part as { type?: unknown }).type === "output_text" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
      if (part && typeof part === "object" && (part as { type?: unknown }).type === "refusal") {
        throw new Error("OpenAI kunne ikke besvare anmodningen.");
      }
    }
  }
  throw new Error("OpenAI returnerede ikke et læsbart svar.");
}
