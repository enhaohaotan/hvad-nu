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
    throw new Error("Indsæt en gyldig URL til en DR-episode.");
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
      "Åbn en bestemt episode i DR Lyd, og indsæt episodens URL.",
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
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  });
  const document = parser.parse(xml);
  const channel = document?.rss?.channel;

  if (!channel) {
    throw new Error("DR returnerede et podcastfeed, der ikke kunne læses.");
  }

  const items = Array.isArray(channel.item)
    ? channel.item
    : channel.item
      ? [channel.item]
      : [];
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
    throw new Error("Episoden findes ikke i DR’s offentlige RSS-feed.");
  }

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
      textValue(channel.image?.url),
    audioUrl,
    sourceUrl: parsedUrl.sourceUrl,
  };
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

  const response = await fetch(feedUrl, {
    signal,
    headers: { Accept: "application/rss+xml, application/xml;q=0.9" },
  });

  if (!response.ok) {
    throw new Error("DR’s podcastfeed er ikke tilgængeligt lige nu.");
  }

  return parseDrFeed(await response.text(), parsedUrl);
}

function assertSafeAudioUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DR’s feed indeholder ikke en gyldig lydfil.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== DR_AUDIO_HOST ||
    !url.pathname.startsWith("/podcasts/v1/assets/")
  ) {
    throw new Error("DR’s feed indeholder en lydplacering, der ikke understøttes.");
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
