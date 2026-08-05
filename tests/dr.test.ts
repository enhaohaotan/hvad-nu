import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDrEpisodeUrl,
  parseDrFeed,
  parseLatestDrFeed,
} from "../lib/dr.ts";

const episodeUrl =
  "https://www.dr.dk/lyd/p1/akkurat-med-clement/akkurat-med-clement-2026/clement-moeder-lone-frank-11162651307";

test("parses a DR episode URL without accepting a show landing page", () => {
  assert.deepEqual(parseDrEpisodeUrl(episodeUrl), {
    episodeId: "11162651307",
    episodeSlug: "clement-moeder-lone-frank",
    showSlug: "akkurat-med-clement",
    sourceUrl: episodeUrl,
  });

  assert.throws(
    () =>
      parseDrEpisodeUrl(
        "https://www.dr.dk/lyd/p1/akkurat-med-clement-4173291094000",
      ),
    /bestemt episode/i,
  );
});

test("falls back to the URL slug when DR's page ID and RSS GUID differ", () => {
  const sourceUrl =
    "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/sort-mand-paa-plakaten-11802650176";
  const episode = parseDrFeed(
    `<rss><channel><title>Genstart</title><item>
      <guid>11802660176</guid>
      <link>https://www.dr.dk/lyd/special-radio/genstart-2642056922000</link>
      <title>Sort mand på plakaten</title>
      <enclosure url="https://api.dr.dk/podcasts/v1/assets/urn:dr:podcast:item:11802660176/audio.mp3" />
    </item></channel></rss>`,
    parseDrEpisodeUrl(sourceUrl),
  );

  assert.equal(episode.id, "11802660176");
  assert.equal(episode.episodeTitle, "Sort mand på plakaten");
  assert.equal(episode.sourceUrl, sourceUrl);
});

test("matches the episode and reads its DR enclosure", () => {
  const parsed = parseDrEpisodeUrl(episodeUrl);
  const episode = parseDrFeed(
    `<?xml version="1.0"?>
      <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
        <channel>
          <title>Akkurat med Clement</title>
          <itunes:image href="https://api.dr.dk/podcasts/v1/images/cover.jpg" />
          <item>
            <guid isPermaLink="false">11162651307</guid>
            <link>${episodeUrl}</link>
            <title>Clement møder Lone Frank</title>
            <description><![CDATA[En <strong>samtale</strong>.]]></description>
            <pubDate>Thu, 30 Jul 2026 05:00:00 +0200</pubDate>
            <itunes:duration>01:10:54</itunes:duration>
            <enclosure url="https://api.dr.dk/podcasts/v1/assets/urn:dr:podcast:item:11162651307/audio.mp3" type="audio/mpeg" length="100" />
          </item>
        </channel>
      </rss>`,
    parsed,
  );

  assert.equal(episode.id, "11162651307");
  assert.equal(episode.showTitle, "Akkurat med Clement");
  assert.equal(episode.episodeTitle, "Clement møder Lone Frank");
  assert.equal(episode.description, "En samtale .");
  assert.equal(episode.duration, "01:10:54");
  assert.match(episode.audioUrl, /^https:\/\/api\.dr\.dk\/podcasts\/v1\/assets\//);
});

test("rejects an enclosure outside DR's fixed podcast host", () => {
  const parsed = parseDrEpisodeUrl(episodeUrl);
  assert.throws(
    () =>
      parseDrFeed(
        `<rss><channel><title>Show</title><item><guid>11162651307</guid><title>Episode</title><enclosure url="https://example.com/audio.mp3" /></item></channel></rss>`,
        parsed,
      ),
    /ikke understøttes/i,
  );
});

test("reads the latest public episode and uses DR Lyd's URL and date", () => {
  const reference = parseDrEpisodeUrl(
    "https://www.dr.dk/lyd/special-radio/genstart/genstart-2025/en-gammel-episode-11802650000",
  );
  const episode = parseLatestDrFeed(
    `<rss><channel><title>Genstart</title>
      <itunes:image href="https://api.dr.dk/podcasts/v1/images/cover.jpg" />
      <item>
        <guid>11802660179</guid>
        <title>Madonna er tilbage</title>
        <pubDate>Wed, 05 Aug 2026 03:00:00 +0200</pubDate>
        <itunes:duration>00:24:37</itunes:duration>
        <enclosure url="https://api.dr.dk/podcasts/v1/assets/urn:dr:podcast:item:11802660179/audio.mp3" />
      </item>
    </channel></rss>`,
    reference,
    `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: {
        pageProps: {
          episodesGroups: [{
            items: [{
              title: "Madonna er tilbage",
              presentationUrl: "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/madonna-er-tilbage-11802650179",
              startTime: "2026-07-31T03:00:00+02:00",
              durationMilliseconds: 1_477_044,
            }],
          }],
        },
      },
    })}</script>`,
  );

  assert.equal(episode.episodeTitle, "Madonna er tilbage");
  assert.equal(episode.duration, "00:24:37");
  assert.equal(
    episode.sourceUrl,
    "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/madonna-er-tilbage-11802650179",
  );
  assert.equal(episode.publishedAt, "2026-07-31T03:00:00+02:00");
});
