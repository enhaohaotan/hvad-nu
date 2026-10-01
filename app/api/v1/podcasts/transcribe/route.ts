import { handlePodcastRequest } from "../../../../../lib/podcast-api.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  return handlePodcastRequest(request, {
    accessToken: process.env.PODCAST_API_TOKEN,
    openAiKey: process.env.OPENAI_API_KEY,
  });
}
