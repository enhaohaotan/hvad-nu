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
