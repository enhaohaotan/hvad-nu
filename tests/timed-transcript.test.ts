import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTranscriptPunctuation,
  mergeTimedWords,
  timedSentencesToText,
  timedWordsToSentences,
  type TimedWord,
} from "../lib/timed-transcript.ts";

function word(word: string, start: number, end = start + 0.25): TimedWord {
  return { word, start, end };
}

test("groups timed words into punctuated sentences", () => {
  const sentences = timedWordsToSentences([
    word("Hej", 0),
    word(",", 0.3),
    word("verden.", 0.5, 0.9),
    word("Hvordan", 1.2),
    word("går", 1.5),
    word("det?", 1.8, 2.2),
  ]);

  assert.deepEqual(sentences, [
    { text: "Hej, verden.", start: 0, end: 0.9 },
    { text: "Hvordan går det?", start: 1.2, end: 2.2 },
  ]);
  assert.equal(timedSentencesToText(sentences), "Hej, verden. Hvordan går det?");
});

test("removes repeated words at a chunk boundary while retaining new times", () => {
  const merged = mergeTimedWords(
    [word("Det", 0), word("er", 0.3), word("godt", 0.6)],
    [word("er", 10), word("godt", 10.3), word("i", 10.6), word("dag.", 10.9)],
  );

  assert.deepEqual(
    merged.map((item) => item.word),
    ["Det", "er", "godt", "i", "dag."],
  );
  assert.equal(merged.at(-1)?.start, 10.9);
});

test("restores punctuation and casing from the full transcript", () => {
  const timedWords = [
    word("hvad", 0),
    word("sagde", 0.3),
    word("han", 0.6),
    word("det", 1),
    word("ved", 1.3),
    word("jeg", 1.6),
    word("ikke", 1.9),
  ];
  const punctuated = applyTranscriptPunctuation(
    "Hvad sagde han? Det ved jeg ikke.",
    timedWords,
  );

  assert.deepEqual(
    punctuated.map((item) => item.word),
    ["Hvad", "sagde", "han?", "Det", "ved", "jeg", "ikke."],
  );
  assert.deepEqual(timedWords.map((item) => item.word), [
    "hvad",
    "sagde",
    "han",
    "det",
    "ved",
    "jeg",
    "ikke",
  ]);
  assert.deepEqual(timedWordsToSentences(punctuated), [
    { text: "Hvad sagde han?", start: 0, end: 0.85 },
    { text: "Det ved jeg ikke.", start: 1, end: 2.15 },
  ]);
});
