import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTranscriptPunctuation,
  alignTranscriptToTimedWords,
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

test("uses accurate transcript text with a separate word timeline", () => {
  const aligned = alignTranscriptToTimedWords(
    "Andrew Tate bliver anholdt. Han nægter sig skyldig.",
    [
      word("Andrew", 0, 0.3),
      word("Tate", 0.35, 0.6),
      word("bliver", 0.7, 0.9),
      word("arresteret", 1, 1.4),
      word("Han", 1.8, 2),
      word("nægter", 2.1, 2.4),
      word("sig", 2.5, 2.6),
      word("skyldig", 2.7, 3),
    ],
  );

  assert.equal(
    aligned.map((item) => item.word).join(" "),
    "Andrew Tate bliver anholdt. Han nægter sig skyldig.",
  );
  assert.equal(aligned[0].start, 0);
  assert.equal(aligned.at(-1)?.end, 3);
  assert.ok(aligned.every((item) => item.end >= item.start));
  assert.deepEqual(
    timedWordsToSentences(aligned).map((sentence) => sentence.text),
    ["Andrew Tate bliver anholdt.", "Han nægter sig skyldig."],
  );
});

test("realigns after a long Whisper-only passage", () => {
  const opening = [
    word("De", 0),
    word("får", 0.3),
    word("håndjern", 0.6),
    word("på.", 0.9),
  ];
  const whisperOnly = Array.from({ length: 30 }, (_, index) =>
    word(`mellemord${index}`, 1.2 + index * 0.2),
  );
  const questionStart = 8;
  const aligned = alignTranscriptToTimedWords(
    "De får håndjern på. Hvad er de sigtet for?",
    [
      ...opening,
      ...whisperOnly,
      word("Hvad", questionStart),
      word("er", questionStart + 0.3),
      word("de", questionStart + 0.6),
      word("sigtet", questionStart + 0.9),
      word("for?", questionStart + 1.2),
    ],
  );

  const question = timedWordsToSentences(aligned)[1];
  assert.equal(question.text, "Hvad er de sigtet for?");
  assert.equal(question.start, questionStart);
});

test("keeps a later repeated phrase on its global timeline position", () => {
  const aligned = alignTranscriptToTimedWords(
    "De får håndjern på. Senere får de håndjern på igen. Hvad er de sigtet for?",
    [
      word("De", 0),
      word("får", 0.2),
      word("håndjern", 0.4),
      word("på.", 0.6),
      word("Senere", 5),
      word("får", 5.2),
      word("de", 5.4),
      word("håndjern", 5.6),
      word("på", 5.8),
      word("igen.", 6),
      word("Hvad", 8),
      word("er", 8.2),
      word("de", 8.4),
      word("sigtet", 8.6),
      word("for?", 8.8),
    ],
  );

  assert.equal(timedWordsToSentences(aligned)[2].start, 8);
});

test("keeps GPT text and distributes it when no reliable anchors exist", () => {
  const timingWords = [
    word("Hvad", 4),
    word("er", 4.2),
    word("der", 4.4),
    word("sket?", 4.6),
  ];
  const aligned = alignTranscriptToTimedWords(
    "Completely unrelated generated transcript content.",
    timingWords,
  );

  const sentences = timedWordsToSentences(aligned);
  assert.equal(
    sentences[0].text,
    "Completely unrelated generated transcript content.",
  );
  assert.equal(sentences[0].start, 4);
  assert.equal(sentences[0].end, 4.85);
});

test("attaches an uncertain sentence when anchors leave too little time", () => {
  const aligned = alignTranscriptToTimedWords(
    "Han går hjem. Denne sætning findes ikke. Hvad sker der?",
    [
      word("Han", 0),
      word("går", 0.3),
      word("hjem.", 0.6),
      word("Hvad", 1),
      word("sker", 1.3),
      word("der?", 1.6),
    ],
  );

  assert.deepEqual(timedWordsToSentences(aligned), [
    {
      text: "Han går hjem. Denne sætning findes ikke.",
      start: 0,
      end: 0.85,
    },
    { text: "Hvad sker der?", start: 1, end: 1.85 },
  ]);
});

test("distributes an uncertain interval according to sentence length", () => {
  const aligned = alignTranscriptToTimedWords(
    "Han går hjem. Kort besked. Denne betydeligt længere sætning har mange flere ord. Hvad sker der?",
    [
      word("Han", 0),
      word("går", 0.3),
      word("hjem.", 0.6),
      word("Hvad", 10),
      word("sker", 10.3),
      word("der?", 10.6),
    ],
  );
  const sentences = timedWordsToSentences(aligned);
  const shortDuration = sentences[1].end - sentences[1].start;
  const longDuration = sentences[2].end - sentences[2].start;

  assert.equal(sentences[1].text, "Kort besked.");
  assert.equal(
    sentences[2].text,
    "Denne betydeligt længere sætning har mange flere ord.",
  );
  assert.ok(longDuration > shortDuration);
  assert.equal(sentences[1].start, 0.85);
  assert.equal(sentences[2].end, 10);
});
