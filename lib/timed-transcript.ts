export type TimedWord = {
  word: string;
  start: number;
  end: number;
};

export type TimedSentence = {
  text: string;
  start: number;
  end: number;
};

const SENTENCE_END = /[.!?…][”’"')\]]*$/u;
const NO_LEADING_SPACE = /^[,.:;!?…%”’"')\]]/u;

export function mergeTimedWords(
  current: TimedWord[],
  incoming: TimedWord[],
): TimedWord[] {
  if (current.length === 0) return incoming;
  if (incoming.length === 0) return current;

  const maxOverlap = Math.min(80, current.length, incoming.length);
  let overlap = 0;
  for (let size = maxOverlap; size >= 2; size--) {
    const tail = current.slice(-size).map(normalizeWord);
    const head = incoming.slice(0, size).map(normalizeWord);
    if (tail.every((word, index) => word === head[index])) {
      overlap = size;
      break;
    }
  }

  return [...current, ...incoming.slice(overlap)];
}

export function applyTranscriptPunctuation(
  transcript: string,
  words: TimedWord[],
): TimedWord[] {
  const transcriptTokens = transcript.match(/\S+/gu) ?? [];
  if (transcriptTokens.length === 0 || words.length === 0) return words;

  const result = words.map((word) => ({ ...word }));
  let tokenIndex = 0;

  for (let wordIndex = 0; wordIndex < result.length; wordIndex++) {
    const normalizedWord = normalizeText(result[wordIndex].word);
    if (!normalizedWord) continue;

    const searchEnd = Math.min(transcriptTokens.length, tokenIndex + 12);
    let matchIndex = -1;
    for (let candidate = tokenIndex; candidate < searchEnd; candidate++) {
      if (normalizeText(transcriptTokens[candidate]) === normalizedWord) {
        matchIndex = candidate;
        break;
      }
    }
    if (matchIndex < 0) continue;

    for (let skipped = tokenIndex; skipped < matchIndex; skipped++) {
      if (!normalizeText(transcriptTokens[skipped]) && wordIndex > 0) {
        result[wordIndex - 1].word += transcriptTokens[skipped];
      }
    }
    result[wordIndex].word = transcriptTokens[matchIndex];
    tokenIndex = matchIndex + 1;
  }

  for (; tokenIndex < transcriptTokens.length; tokenIndex++) {
    if (!normalizeText(transcriptTokens[tokenIndex])) {
      result[result.length - 1].word += transcriptTokens[tokenIndex];
    }
  }
  return result;
}

export function alignTranscriptToTimedWords(
  transcript: string,
  timingWords: TimedWord[],
): TimedWord[] {
  const transcriptTokens = transcript.match(/\S+/gu) ?? [];
  if (transcriptTokens.length === 0 || timingWords.length === 0) return [];

  const anchors: Array<{ transcriptIndex: number; timingIndex: number }> = [
    { transcriptIndex: 0, timingIndex: 0 },
  ];
  let timingSearchStart = 0;
  for (
    let transcriptIndex = 0;
    transcriptIndex < transcriptTokens.length;
    transcriptIndex++
  ) {
    const normalizedToken = normalizeText(transcriptTokens[transcriptIndex]);
    if (!normalizedToken) continue;
    const searchEnd = Math.min(timingWords.length, timingSearchStart + 24);
    for (let timingIndex = timingSearchStart; timingIndex < searchEnd; timingIndex++) {
      if (normalizeWord(timingWords[timingIndex]) === normalizedToken) {
        anchors.push({ transcriptIndex, timingIndex });
        timingSearchStart = timingIndex + 1;
        break;
      }
    }
  }
  anchors.push({
    transcriptIndex: transcriptTokens.length,
    timingIndex: timingWords.length,
  });

  const uniqueAnchors = anchors.filter(
    (anchor, index) =>
      index === 0 ||
      anchor.transcriptIndex > anchors[index - 1].transcriptIndex,
  );
  let anchorIndex = 0;
  return transcriptTokens.map((token, transcriptIndex) => {
    while (
      anchorIndex < uniqueAnchors.length - 2 &&
      transcriptIndex >= uniqueAnchors[anchorIndex + 1].transcriptIndex
    ) {
      anchorIndex++;
    }
    const previous = uniqueAnchors[anchorIndex];
    const next = uniqueAnchors[anchorIndex + 1];
    const span = Math.max(1, next.transcriptIndex - previous.transcriptIndex);
    const progress = (transcriptIndex - previous.transcriptIndex) / span;
    const startPosition =
      previous.timingIndex + progress * (next.timingIndex - previous.timingIndex);
    const endProgress = (transcriptIndex + 1 - previous.transcriptIndex) / span;
    const endPosition =
      previous.timingIndex +
      Math.min(1, endProgress) * (next.timingIndex - previous.timingIndex);
    return {
      word: token,
      start: timeAtBoundary(timingWords, startPosition),
      end: timeAtBoundary(timingWords, Math.max(startPosition, endPosition)),
    };
  });
}

export function timedWordsToSentences(words: TimedWord[]): TimedSentence[] {
  const sentences: TimedSentence[] = [];
  let sentenceWords: TimedWord[] = [];

  function flush() {
    if (sentenceWords.length === 0) return;
    const text = joinWords(sentenceWords.map((word) => word.word));
    if (text) {
      sentences.push({
        text,
        start: sentenceWords[0].start,
        end: sentenceWords.at(-1)?.end ?? sentenceWords[0].end,
      });
    }
    sentenceWords = [];
  }

  for (const word of words) {
    sentenceWords.push(word);
    const visibleWord = word.word.trim();
    if (SENTENCE_END.test(visibleWord) || sentenceWords.length >= 60) flush();
  }
  flush();
  return sentences;
}

export function timedSentencesToText(sentences: TimedSentence[]): string {
  return sentences.map((sentence) => sentence.text).join(" ").trim();
}

function joinWords(words: string[]): string {
  let text = "";
  for (const rawWord of words) {
    const word = rawWord.trim();
    if (!word) continue;
    if (!text || NO_LEADING_SPACE.test(word)) text += word;
    else text += ` ${word}`;
  }
  return text.trim();
}

function normalizeWord(word: TimedWord): string {
  return normalizeText(word.word);
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("da")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

function timeAtBoundary(words: TimedWord[], position: number): number {
  if (position <= 0) return words[0].start;
  if (position >= words.length) return words.at(-1)?.end ?? 0;

  const lower = Math.floor(position);
  const fraction = position - lower;
  const lowerBoundary =
    lower === 0
      ? words[0].start
      : (words[lower - 1].end + words[lower].start) / 2;
  if (fraction === 0 || lower >= words.length - 1) return lowerBoundary;
  const upperBoundary = (words[lower].end + words[lower + 1].start) / 2;
  return lowerBoundary + (upperBoundary - lowerBoundary) * fraction;
}
