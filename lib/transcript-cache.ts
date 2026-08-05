export const MAX_CACHED_TRANSCRIPTS = 10;

export type TranscriptCacheEntry = {
  audioUrl: string;
  model: string;
  transcript: string;
  cachedAt: number;
  firstGeneratedAt?: number;
  isRegenerated?: boolean;
  sourceUrl?: string;
  episodeTitle?: string;
  showTitle?: string;
  publishedAt?: string;
  duration?: string;
};

export function parseTranscriptCache(value: string | null): TranscriptCacheEntry[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is TranscriptCacheEntry =>
      typeof entry === "object" &&
      entry !== null &&
      typeof entry.audioUrl === "string" &&
      typeof entry.model === "string" &&
      typeof entry.transcript === "string" &&
      typeof entry.cachedAt === "number" &&
      (entry.firstGeneratedAt === undefined || typeof entry.firstGeneratedAt === "number") &&
      (entry.isRegenerated === undefined || typeof entry.isRegenerated === "boolean") &&
      (entry.sourceUrl === undefined || typeof entry.sourceUrl === "string") &&
      (entry.episodeTitle === undefined || typeof entry.episodeTitle === "string") &&
      (entry.showTitle === undefined || typeof entry.showTitle === "string") &&
      (entry.publishedAt === undefined || typeof entry.publishedAt === "string") &&
      (entry.duration === undefined || typeof entry.duration === "string")
    );
  } catch {
    return [];
  }
}

export function findCachedTranscript(
  entries: TranscriptCacheEntry[],
  audioUrl: string,
  model: string,
): TranscriptCacheEntry | undefined {
  return entries.find((entry) => entry.audioUrl === audioUrl && entry.model === model);
}

export function addCachedTranscript(
  entries: TranscriptCacheEntry[],
  nextEntry: TranscriptCacheEntry,
  keepPreviousVersions = false,
): TranscriptCacheEntry[] {
  const existing = findCachedTranscript(
    entries,
    nextEntry.audioUrl,
    nextEntry.model,
  );
  const entry = {
    ...nextEntry,
    firstGeneratedAt:
      nextEntry.firstGeneratedAt ??
      existing?.firstGeneratedAt ??
      existing?.cachedAt ??
      nextEntry.cachedAt,
  };

  return [
    entry,
    ...(keepPreviousVersions
      ? entries
      : entries.filter(
          (entry) =>
            entry.audioUrl !== nextEntry.audioUrl ||
            entry.model !== nextEntry.model,
        )),
  ].slice(0, MAX_CACHED_TRANSCRIPTS);
}

export function isRegeneratedTranscript(
  entries: TranscriptCacheEntry[],
  target: TranscriptCacheEntry,
): boolean {
  if (target.isRegenerated !== undefined) return target.isRegenerated;

  const targetTime = target.firstGeneratedAt ?? target.cachedAt;
  return entries.some(
    (entry) =>
      entry.audioUrl === target.audioUrl &&
      entry.model === target.model &&
      (entry.firstGeneratedAt ?? entry.cachedAt) < targetTime,
  );
}
