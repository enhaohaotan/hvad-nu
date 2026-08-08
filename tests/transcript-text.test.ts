import assert from "node:assert/strict";
import test from "node:test";
import { mergeTranscriptParts } from "../lib/transcript-text.ts";

test("merges chunks into one paragraph", () => {
  assert.equal(
    mergeTranscriptParts(
      "Det her er starten.\n\nSætningen fortsætter",
      "på tværs af den næste lyddel.",
    ),
    "Det her er starten. Sætningen fortsætter på tværs af den næste lyddel.",
  );
});

test("removes repeated words at a chunk boundary", () => {
  assert.equal(
    mergeTranscriptParts(
      "Hun gik hele vejen ned til stationen.",
      "Ned til stationen, hvor toget ventede.",
    ),
    "Hun gik hele vejen ned til stationen, hvor toget ventede.",
  );
});

test("keeps an intentional single-word repetition", () => {
  assert.equal(
    mergeTranscriptParts("Nej.", "Nej, det passer ikke."),
    "Nej. Nej, det passer ikke.",
  );
});

test("does not append a fully repeated chunk", () => {
  assert.equal(
    mergeTranscriptParts("Det er den samme korte sætning.", "Den samme korte sætning."),
    "Det er den samme korte sætning.",
  );
});
