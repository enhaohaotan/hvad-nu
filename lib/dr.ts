import { XMLParser } from "fast-xml-parser";

const DR_HOSTS = new Set(["dr.dk", "www.dr.dk"]);
const DR_AUDIO_HOST = "api.dr.dk";

export type DrEpisode = {
  id: string;
  showTitle: string;
  episodeTitle: string;
  description: string;
  duration: string;
  publishedAt: string;
  imageUrl: string;
  audioUrl: string;
  sourceUrl: string;
};

export type ParsedDrUrl = {
  episodeId: string;
  episodeSlug: string;
  showSlug: string;
  sourceUrl: string;
};

export function parseDrEpisodeUrl(value: string): ParsedDrUrl {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Indsæt en gyldig URL til en DR LYD-episode.");
  }

  if (url.protocol !== "https:" || !DR_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Brug et HTTPS-link til en episode fra dr.dk.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const episodeMatch = segments.at(-1)?.match(/^(.+)-(\d{6,})$/);
  const episodeSlug = episodeMatch?.[1];
  const episodeId = episodeMatch?.[2];
  const showSlug = segments[2];

  if (
    segments[0] !== "lyd" ||
    segments.length < 5 ||
    !episodeId ||
    !episodeSlug ||
    !showSlug ||
    !/^[a-z0-9-]+$/i.test(showSlug)
  ) {
    throw new Error(
      "Åbn en bestemt episode i DR LYD, og indsæt episodens URL.",
    );
  }

  return {
    episodeId,
    episodeSlug: episodeSlug.toLowerCase(),
    showSlug: showSlug.toLowerCase(),
    sourceUrl: url.toString(),
  };
}

export function parseDrFeed(xml: string, parsedUrl: ParsedDrUrl): DrEpisode {
  const channel = parseFeedChannel(xml);
  const items = feedItems(channel);
  let item = items.find((candidate: Record<string, unknown>) => {
    const guid = textValue(candidate.guid);
    const link = textValue(candidate.link);
    return guid === parsedUrl.episodeId || link.includes(parsedUrl.episodeId);
  });

  // DR's episode-page ID occasionally differs from its RSS GUID. In that
  // case, the human-readable URL slug is the stable bridge to the feed item.
  if (!item) {
    const titleMatches = items.filter(
      (candidate: Record<string, unknown>) =>
        toDrSlug(textValue(candidate.title)) === parsedUrl.episodeSlug,
    );

    if (titleMatches.length === 1) {
      item = titleMatches[0];
    }
  }

  if (!item) {
    throw new Error("Episoden findes ikke i DR LYDs offentlige RSS-feed.");
  }

  return episodeFromFeedItem(channel, item, parsedUrl, parsedUrl.sourceUrl);
}

export function parseLatestDrFeed(
  xml: string,
  referenceUrl: ParsedDrUrl,
  seriesPageHtml?: string,
): DrEpisode {
  const channel = parseFeedChannel(xml);
  const item = feedItems(channel).find((candidate) =>
    Boolean(attributeValue(candidate.enclosure, "url")),
  );

  if (!item) {
    throw new Error("DR LYDs offentlige RSS-feed indeholder ingen episoder.");
  }

  const pageEpisode = seriesPageHtml
    ? findSeriesPageEpisode(seriesPageHtml, textValue(item.title))
    : null;
  if (seriesPageHtml && !pageEpisode) {
    throw new Error("Episoden kunne ikke matches med DR LYD.");
  }
  const sourceUrl =
    pageEpisode?.presentationUrl ??
    buildEpisodeSourceUrl(referenceUrl.sourceUrl, item);
  return enrichEpisodeFromDrPage(
    episodeFromFeedItem(channel, item, referenceUrl, sourceUrl),
    pageEpisode,
  );
}

export async function resolveDrEpisode(
  value: string,
  signal?: AbortSignal,
): Promise<DrEpisode> {
  const parsedUrl = parseDrEpisodeUrl(value);
  const feedUrl = new URL(
    `https://api.dr.dk/podcasts/v1/feeds/${parsedUrl.showSlug}.xml`,
  );
  feedUrl.searchParams.set("format", "podcast");
  feedUrl.searchParams.set("limit", "500");

  const [response, episodePageHtml] = await Promise.all([
    fetch(feedUrl, {
      signal,
      headers: { Accept: "application/rss+xml, application/xml;q=0.9" },
    }),
    fetchOptionalDrPage(parsedUrl.sourceUrl, signal),
  ]);

  if (!response.ok) {
    throw new Error("DR LYDs podcastfeed er ikke tilgængeligt lige nu.");
  }

  const episode = parseDrFeed(await response.text(), parsedUrl);
  return enrichEpisodeFromDrPage(
    episode,
    episodePageHtml ? findEpisodePageEpisode(episodePageHtml) : null,
  );
}

export async function resolveLatestDrEpisode(
  value: string,
  signal?: AbortSignal,
): Promise<DrEpisode> {
  const parsedUrl = parseDrEpisodeUrl(value);
  const feedUrl = new URL(
    `https://api.dr.dk/podcasts/v1/feeds/${parsedUrl.showSlug}.xml`,
  );
  feedUrl.searchParams.set("format", "podcast");
  feedUrl.searchParams.set("limit", "10");

  const [response, seriesPageHtml] = await Promise.all([
    fetch(feedUrl, {
      signal,
      headers: { Accept: "application/rss+xml, application/xml;q=0.9" },
    }),
    fetchOptionalDrPage(buildSeriesPageUrl(parsedUrl.sourceUrl), signal),
  ]);

  if (!response.ok) {
    throw new Error("DR LYDs podcastfeed er ikke tilgængeligt lige nu.");
  }

  if (!seriesPageHtml) {
    throw new Error("DR LYD viser ikke den seneste episode lige nu.");
  }

  return parseLatestDrFeed(await response.text(), parsedUrl, seriesPageHtml);
}

type DrPageEpisode = {
  durationMilliseconds?: number;
  presentationUrl?: string;
  startTime?: string;
  title?: string;
};

function findEpisodePageEpisode(html: string): DrPageEpisode | null {
  const pageProps = nextPageProps(html);
  return pageProps && isRecord(pageProps.episode)
    ? pageProps.episode as DrPageEpisode
    : null;
}

function findSeriesPageEpisode(
  html: string,
  episodeTitle: string,
): DrPageEpisode | null {
  const pageProps = nextPageProps(html);
  const groups = pageProps && Array.isArray(pageProps.episodesGroups)
    ? pageProps.episodesGroups
    : [];

  for (const group of groups) {
    if (!isRecord(group) || !Array.isArray(group.items)) continue;
    const match = group.items.find(
      (item) => isRecord(item) && textValue(item.title) === episodeTitle,
    );
    if (isRecord(match)) return match as DrPageEpisode;
  }

  return null;
}

function nextPageProps(html: string): Record<string, unknown> | null {
  const match = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]) as unknown;
    if (!isRecord(data) || !isRecord(data.props)) return null;
    return isRecord(data.props.pageProps) ? data.props.pageProps : null;
  } catch {
    return null;
  }
}

function enrichEpisodeFromDrPage(
  episode: DrEpisode,
  pageEpisode: DrPageEpisode | null,
): DrEpisode {
  if (!pageEpisode) return episode;

  let sourceUrl = episode.sourceUrl;
  if (pageEpisode.presentationUrl) {
    try {
      sourceUrl = parseDrEpisodeUrl(pageEpisode.presentationUrl).sourceUrl;
    } catch {
      // Keep the already validated source URL when DR's page data is malformed.
    }
  }

  return {
    ...episode,
    sourceUrl,
    publishedAt: pageEpisode.startTime || episode.publishedAt,
    duration:
      typeof pageEpisode.durationMilliseconds === "number"
        ? millisecondsToDuration(pageEpisode.durationMilliseconds)
        : episode.duration,
  };
}

async function fetchOptionalDrPage(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal,
      headers: { Accept: "text/html" },
    });
    return response.ok ? response.text() : null;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

function buildSeriesPageUrl(referenceUrl: string): string {
  const url = new URL(referenceUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  url.pathname = `/${segments.slice(0, 3).join("/")}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function millisecondsToDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseFeedChannel(xml: string): Record<string, unknown> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  });
  const document = parser.parse(xml) as {
    rss?: { channel?: Record<string, unknown> };
  };
  const channel = document.rss?.channel;

  if (!channel) {
    throw new Error("DR LYD returnerede et podcastfeed, der ikke kunne læses.");
  }

  return channel;
}

function feedItems(channel: Record<string, unknown>): Record<string, unknown>[] {
  const value = channel.item;
  if (Array.isArray(value)) return value;
  return value && typeof value === "object"
    ? [value as Record<string, unknown>]
    : [];
}

function episodeFromFeedItem(
  channel: Record<string, unknown>,
  item: Record<string, unknown>,
  parsedUrl: ParsedDrUrl,
  sourceUrl: string,
): DrEpisode {
  const audioUrl = attributeValue(item.enclosure, "url");
  assertSafeAudioUrl(audioUrl);

  return {
    id: textValue(item.guid) || parsedUrl.episodeId,
    showTitle: textValue(channel.title) || parsedUrl.showSlug,
    episodeTitle: textValue(item.title) || "Episode uden titel",
    description: stripMarkup(textValue(item.description)),
    duration: textValue(item["itunes:duration"]),
    publishedAt: textValue(item.pubDate),
    imageUrl:
      attributeValue(channel["itunes:image"], "href") ||
      childTextValue(channel.image, "url"),
    audioUrl,
    sourceUrl,
  };
}

function buildEpisodeSourceUrl(
  referenceUrl: string,
  item: Record<string, unknown>,
): string {
  const url = new URL(referenceUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  const guid = textValue(item.guid);
  const title = textValue(item.title);
  const publishedAt = new Date(textValue(item.pubDate));
  const year = Number.isNaN(publishedAt.getTime())
    ? ""
    : String(publishedAt.getFullYear());

  if (!guid || !title || segments.length < 5) {
    throw new Error("DR LYDs seneste episode mangler nødvendige oplysninger.");
  }

  if (year && /-\d{4}$/.test(segments[3])) {
    segments[3] = segments[3].replace(/-\d{4}$/, `-${year}`);
  }
  segments[segments.length - 1] = `${toDrSlug(title)}-${guid}`;
  url.pathname = `/${segments.join("/")}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function assertSafeAudioUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DR LYDs feed indeholder ikke en gyldig lydfil.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== DR_AUDIO_HOST ||
    !url.pathname.startsWith("/podcasts/v1/assets/")
  ) {
    throw new Error("DR LYDs feed indeholder en lydplacering, der ikke understøttes.");
  }
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (value && typeof value === "object" && "#text" in value) {
    return textValue((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

function attributeValue(value: unknown, name: string): string {
  if (!value || typeof value !== "object") return "";
  return textValue((value as Record<string, unknown>)[`@_${name}`]);
}

function childTextValue(value: unknown, name: string): string {
  if (!value || typeof value !== "object") return "";
  return textValue((value as Record<string, unknown>)[name]);
}

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDrSlug(value: string): string {
  return value
    .toLocaleLowerCase("da")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
