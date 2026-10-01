import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { handlePodcastRequest } from "../lib/podcast-api.ts";
import { POST } from "../app/api/v1/podcasts/transcribe/route.ts";

// Every test intercepts fetch. No fallback to the real network is permitted.
const config = { accessToken: "test-service-token", openAiKey: "test-provider-key" };
const latestUrl = "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/ny-episode-123456789";
const olderUrl = "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/gammel-episode-123456788";
const transcript = "Det er en dansk transskription.";

function request(body: unknown = { name: "Genstart" }, token = config.accessToken): Request {
  return new Request("https://example.test/api/v1/podcasts/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function denyNetwork(t: TestContext) {
  return t.mock.method(globalThis, "fetch", async () => {
    assert.fail("This request must not make any network calls.");
  });
}

function mockPipeline(t: TestContext, options: { text?: string; fail?: "resolve" | "transcribe" | "translate"; emptyDescription?: boolean } = {}) {
  const translations: { id: number; text: string }[][] = [];
  const calls: string[] = [];
  const mock = t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    assert.ok(init?.signal, "All pipeline requests must be cancellable.");
    if (url.startsWith("https://api.dr.dk/podcasts/v1/feeds/")) {
      if (options.fail === "resolve") return new Response("unavailable", { status: 503 });
      return new Response(`<rss><channel><title>Genstart</title>${[
        ["123456789", "Ny episode", latestUrl],
        ["123456788", "Gammel episode", olderUrl],
      ].map(([id, title, link]) => `<item><guid>${id}</guid><title>${title}</title><link>${link}</link><description>${options.emptyDescription ? "" : "Dansk beskrivelse."}</description><pubDate>Thu, 01 Oct 2026 06:00:00 GMT</pubDate><enclosure url="https://api.dr.dk/podcasts/v1/assets/${id}/audio.mp3" /></item>`).join("")}</channel></rss>`);
    }
    if (url.startsWith("https://www.dr.dk/")) {
      return new Response(`<script id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { episodesGroups: [{ items: [{ title: "Ny episode", presentationUrl: latestUrl }] }] } } })}</script>`);
    }
    if (url.startsWith("https://api.dr.dk/podcasts/v1/assets/")) {
      const audio = new Uint8Array(626 * 4);
      for (let index = 0; index < 4; index++) audio.set([0xff, 0xfb, 0xb0, 0x00], index * 626);
      return new Response(audio);
    }
    if (url === "https://api.openai.com/v1/audio/transcriptions") {
      assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${config.openAiKey}`);
      assert.ok(init?.body instanceof FormData);
      assert.equal(init.body.get("model"), "gpt-transcribe");
      assert.deepEqual(init.body.getAll("languages[]"), ["da"]);
      if (options.fail === "transcribe") return new Response(config.openAiKey, { status: 429 });
      return Response.json({ text: options.text ?? transcript });
    }
    if (url === "https://api.openai.com/v1/responses") {
      assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${config.openAiKey}`);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      if (options.fail === "translate") return Response.json({ error: { message: config.openAiKey } }, { status: 500 });
      const sentences = JSON.parse(body.input) as { id: number; text: string }[];
      translations.push(sentences);
      assert.ok(sentences.reduce((sum, item) => sum + item.text.length, 0) <= 12_000);
      return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ translations: Object.fromEntries(sentences.map((item) => [`s${item.id}`, `Translated: ${item.text}`])) }) }] }] });
    }
    assert.fail(`Unexpected request: ${url}`);
  });
  return { mock, calls, translations };
}

test("requires a configured service token, separately from the provider key", async (t) => {
  const network = denyNetwork(t);
  for (const token of ["", "wrong", config.openAiKey]) {
    const response = await handlePodcastRequest(request(undefined, token), config);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("www-authenticate"), "Bearer");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await handlePodcastRequest(request(), {})).status, 503);
  assert.equal((await handlePodcastRequest(request(), { accessToken: config.accessToken })).status, 503);
  assert.equal(network.mock.callCount(), 0);
});

test("rejects invalid inputs before any download or paid processing", async (t) => {
  const network = denyNetwork(t);
  for (const body of [
    null, [], {}, { name: "" }, { name: "Unknown" }, { name: "__proto__" },
    { name: "Genstart", language: "en" }, { name: "Genstart", apiKey: "untrusted" },
    { name: "Genstart", url: null }, { name: "Genstart", url: "" },
    { name: "Genstart", url: "http://127.0.0.1/audio.mp3" },
    { name: "Genstart", url: olderUrl.replace("/genstart/", "/another-show/") },
    { name: "Genstart", url: olderUrl.replace("www.dr.dk", "www.dr.dk:444") },
    { name: "Genstart", url: olderUrl.replace("www.dr.dk", "user:pass@www.dr.dk") },
    { name: "Genstart", translations: null }, { name: "Genstart", translations: "zh" },
    { name: "Genstart", translations: ["constructor"] }, { name: "Genstart", translations: ["toString"] },
    { name: "Genstart", translations: ["xx"] }, { name: "Genstart", translations: ["zh", "en", "de", "fr"] },
  ]) {
    assert.equal((await handlePodcastRequest(request(body), config)).status, 400, JSON.stringify(body));
  }
  assert.equal(network.mock.callCount(), 0);
});

test("rejects malformed, oversized, and non-JSON bodies without network access", async (t) => {
  const network = denyNetwork(t);
  for (const body of ["{", " ".repeat(16_385)]) {
    const value = request();
    const malformed = new Request(value.url, { method: "POST", headers: value.headers, body });
    assert.equal((await handlePodcastRequest(malformed, config)).status, 400);
  }
  const value = request();
  value.headers.set("Content-Type", "text/plain");
  assert.equal((await handlePodcastRequest(value, config)).status, 415);
  assert.equal(network.mock.callCount(), 0);
});

test("defaults to the latest Genstart episode with Danish text and no translations", async (t) => {
  const pipeline = mockPipeline(t);
  const response = await handlePodcastRequest(request({ name: " genSTART " }), config);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    name: "Genstart", title: "Ny episode", description: "Dansk beskrivelse.", transcript, translations: [],
  });
  assert.ok(pipeline.calls.some((url) => url.includes("limit=10")));
  assert.equal(pipeline.translations.length, 0);
  assert.equal(pipeline.calls.filter((url) => url.startsWith("https://api.openai.com/")).length, 1);
});

test("url selects an older episode and translations include title, description, and transcript", async (t) => {
  const pipeline = mockPipeline(t);
  const response = await handlePodcastRequest(request({ name: "Genstart", url: olderUrl, translations: ["zh", "en", "zh"] }), config);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.title, "Gammel episode");
  assert.deepEqual(body.translations, ["zh", "en"].map((language) => ({
    language, title: "Translated: Gammel episode", description: "Translated: Dansk beskrivelse.", transcript: `Translated: ${transcript}`,
  })));
  assert.ok(pipeline.calls.some((url) => url.includes("assets/123456788/")));
  assert.ok(!pipeline.calls.some((url) => url.includes("assets/123456789/")));
  assert.equal(pipeline.translations.length, 2, "Duplicate languages must not incur duplicate calls.");
});

test("long translations use bounded batches without omitting source text", async (t) => {
  const text = "En dansk sætning. ".repeat(1800).trim();
  const pipeline = mockPipeline(t, { text, emptyDescription: true });
  const response = await handlePodcastRequest(request({ name: "Genstart", translations: ["zh"] }), config);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.translations[0].description, "");
  assert.ok(pipeline.translations.length >= 3);
  const sent = pipeline.translations.flat().map((item) => item.text);
  assert.equal(sent.shift(), "Ny episode");
  assert.equal(sent.join(" "), text);
});

for (const stage of ["resolve", "transcribe", "translate"] as const) {
  test(`returns a sanitized ${stage} error without automatic retries`, async (t) => {
    const pipeline = mockPipeline(t, { fail: stage });
    const response = await handlePodcastRequest(request({ name: "Genstart", translations: ["zh"] }), config);
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.error.code, `${stage}_failed`);
    assert.ok(!JSON.stringify(body).includes(config.openAiKey));
    assert.ok(pipeline.calls.filter((url) => url.includes("/audio/transcriptions")).length <= 1);
    assert.ok(pipeline.calls.filter((url) => url.endsWith("/responses")).length <= 1);
  });
}

test("aborted requests stop before paid processing", async (t) => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, "fetch", async (_input: unknown, init?: RequestInit) => {
    init?.signal?.throwIfAborted();
    assert.fail("Expected an aborted request.");
  });
  const response = await handlePodcastRequest(new Request(request(), { signal: controller.signal }), config);
  assert.equal(response.status, 504);
});

test("the actual route uses the server's environment credentials", async (t) => {
  const previousToken = process.env.PODCAST_API_TOKEN;
  const previousKey = process.env.OPENAI_API_KEY;
  t.after(() => {
    if (previousToken === undefined) delete process.env.PODCAST_API_TOKEN;
    else process.env.PODCAST_API_TOKEN = previousToken;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });
  process.env.PODCAST_API_TOKEN = config.accessToken;
  process.env.OPENAI_API_KEY = config.openAiKey;
  mockPipeline(t);
  assert.equal((await POST(request())).status, 200);
});
