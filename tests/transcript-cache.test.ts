import assert from "node:assert/strict";
import test from "node:test";
import {
  addCachedTranscript,
  findCachedTranscript,
  isRegeneratedTranscript,
  MAX_CACHED_TRANSCRIPTS,
  parseTranscriptCache,
  type TranscriptCacheEntry,
} from "../lib/transcript-cache.ts";

function entry(index: number): TranscriptCacheEntry {
  return {
    audioUrl: `https://api.dr.dk/audio-${index}.mp3`,
    model: "gpt-transcribe",
    transcript: `Transskription ${index}`,
    cachedAt: index,
  };
}

test("keeps only the ten newest cached transcripts", () => {
  const entries = Array.from({ length: MAX_CACHED_TRANSCRIPTS }, (_, index) =>
    entry(MAX_CACHED_TRANSCRIPTS - index - 1),
  );
  const updated = addCachedTranscript(entries, entry(10));

  assert.equal(updated.length, 10);
  assert.equal(updated[0].audioUrl, entry(10).audioUrl);
  assert.equal(updated.some((item) => item.audioUrl === entry(0).audioUrl), false);
});

test("replaces a cached transcript for the same audio and model", () => {
  const original = entry(1);
  const replacement = { ...original, transcript: "Ny tekst", cachedAt: 2 };
  const updated = addCachedTranscript([original], replacement);

  assert.deepEqual(updated, [{ ...replacement, firstGeneratedAt: 1 }]);
  assert.equal(
    findCachedTranscript(updated, original.audioUrl, original.model)?.transcript,
    "Ny tekst",
  );
  assert.equal(updated[0].firstGeneratedAt, original.cachedAt);

  const regenerated = addCachedTranscript(updated, {
    ...replacement,
    cachedAt: 3,
    firstGeneratedAt: 3,
  });
  assert.equal(regenerated[0].firstGeneratedAt, 3);
});

test("keeps the previous transcript when a new version is generated", () => {
  const original = { ...entry(1), firstGeneratedAt: 1 };
  const regenerated = {
    ...original,
    transcript: "Ny version",
    cachedAt: 2,
    firstGeneratedAt: 2,
  };
  const updated = addCachedTranscript([original], regenerated, true);

  assert.equal(updated.length, 2);
  assert.equal(updated[0].transcript, "Ny version");
  assert.equal(updated[1].transcript, original.transcript);
  assert.equal(isRegeneratedTranscript(updated, updated[0]), true);
  assert.equal(isRegeneratedTranscript(updated, updated[1]), false);
});

test("ignores invalid browser cache data", () => {
  assert.deepEqual(parseTranscriptCache("ikke json"), []);
  assert.deepEqual(parseTranscriptCache(JSON.stringify([{ transcript: 4 }])), []);
});
