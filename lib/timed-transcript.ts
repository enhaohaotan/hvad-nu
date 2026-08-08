export type TimedWord = {
  word: string;
  start: number;
  end: number;
  timelineGroup?: symbol;
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

  const anchors = globalAlignmentAnchors(transcriptTokens, timingWords);
  const aligned: TimedWord[] = [];
  let previousTranscriptIndex = -1;
  let previousTimingIndex = -1;

  for (const anchor of anchors) {
    appendInterpolatedWords(
      aligned,
      transcriptTokens,
      previousTranscriptIndex + 1,
      anchor.transcriptIndex,
      timingWords,
      previousTimingIndex + 1,
      anchor.timingIndex,
    );
    aligned.push({
      word: transcriptTokens[anchor.transcriptIndex],
      start: timingWords[anchor.timingIndex].start,
      end: timingWords[anchor.timingIndex].end,
    });
    previousTranscriptIndex = anchor.transcriptIndex;
    previousTimingIndex = anchor.timingIndex;
  }

  appendInterpolatedWords(
    aligned,
    transcriptTokens,
    previousTranscriptIndex + 1,
    transcriptTokens.length,
    timingWords,
    previousTimingIndex + 1,
    timingWords.length,
  );
  return assignSentenceTimeline(aligned, transcriptTokens, timingWords, anchors);
}

type AlignmentToken = {
  originalIndex: number;
  normalized: string;
};

type AlignmentAnchor = {
  transcriptIndex: number;
  timingIndex: number;
};

const MAX_ALIGNMENT_CELLS = 16_000_000;

function globalAlignmentAnchors(
  transcriptTokens: string[],
  timingWords: TimedWord[],
): AlignmentAnchor[] {
  const transcriptItems: AlignmentToken[] = transcriptTokens
    .map((token, originalIndex) => ({
      originalIndex,
      normalized: normalizeText(token),
    }))
    .filter((token) => token.normalized);
  const timingItems: AlignmentToken[] = timingWords
    .map((word, originalIndex) => ({
      originalIndex,
      normalized: normalizeWord(word),
    }))
    .filter((token) => token.normalized);
  const rows = transcriptItems.length + 1;
  const columns = timingItems.length + 1;
  if (
    transcriptItems.length === 0 ||
    timingItems.length === 0 ||
    rows * columns > MAX_ALIGNMENT_CELLS
  ) {
    return [];
  }

  const frequencies = new Map<string, number>();
  for (const item of [...transcriptItems, ...timingItems]) {
    frequencies.set(item.normalized, (frequencies.get(item.normalized) ?? 0) + 1);
  }

  const traceback = new Uint8Array(rows * columns);
  let previousScores = new Float32Array(columns);
  let currentScores = new Float32Array(columns);

  for (let row = 1; row < rows; row++) {
    currentScores[0] = 0;
    const transcriptItem = transcriptItems[row - 1];
    for (let column = 1; column < columns; column++) {
      const timingItem = timingItems[column - 1];
      const up = previousScores[column];
      const left = currentScores[column - 1];
      const traceIndex = row * columns + column;
      if (transcriptItem.normalized === timingItem.normalized) {
        const frequency = frequencies.get(transcriptItem.normalized) ?? 1;
        const weight =
          1 +
          Math.min(12, transcriptItem.normalized.length) / 8 +
          2 / frequency;
        const diagonal = previousScores[column - 1] + weight;
        if (diagonal >= up && diagonal >= left) {
          currentScores[column] = diagonal;
          traceback[traceIndex] = 1;
          continue;
        }
      }

      if (up > left) {
        currentScores[column] = up;
        traceback[traceIndex] = 2;
      } else if (left > up) {
        currentScores[column] = left;
        traceback[traceIndex] = 3;
      } else if (row / rows > column / columns) {
        currentScores[column] = left;
        traceback[traceIndex] = 3;
      } else {
        currentScores[column] = up;
        traceback[traceIndex] = 2;
      }
    }
    [previousScores, currentScores] = [currentScores, previousScores];
  }

  const anchors: AlignmentAnchor[] = [];
  let row = transcriptItems.length;
  let column = timingItems.length;
  while (row > 0 && column > 0) {
    const direction = traceback[row * columns + column];
    if (direction === 1) {
      anchors.push({
        transcriptIndex: transcriptItems[row - 1].originalIndex,
        timingIndex: timingItems[column - 1].originalIndex,
      });
      row--;
      column--;
    } else if (direction === 2) {
      row--;
    } else {
      column--;
    }
  }
  return anchors.reverse();
}

function appendInterpolatedWords(
  result: TimedWord[],
  transcriptTokens: string[],
  transcriptStart: number,
  transcriptEnd: number,
  timingWords: TimedWord[],
  timingStart: number,
  timingEnd: number,
) {
  const tokenCount = transcriptEnd - transcriptStart;
  if (tokenCount <= 0) return;

  for (let offset = 0; offset < tokenCount; offset++) {
    const startPosition =
      timingStart + (offset / tokenCount) * (timingEnd - timingStart);
    const endPosition =
      timingStart + ((offset + 1) / tokenCount) * (timingEnd - timingStart);
    result.push({
      word: transcriptTokens[transcriptStart + offset],
      start: timeAtBoundary(timingWords, startPosition),
      end: timeAtBoundary(timingWords, Math.max(startPosition, endPosition)),
    });
  }
}

type SentencePlan = {
  tokenStart: number;
  tokenEnd: number;
  reliable: boolean;
  weight: number;
  wordCount: number;
  start: number;
  end: number;
  group: symbol;
};

function assignSentenceTimeline(
  aligned: TimedWord[],
  transcriptTokens: string[],
  timingWords: TimedWord[],
  anchors: AlignmentAnchor[],
): TimedWord[] {
  const plans = sentenceRanges(transcriptTokens).map<SentencePlan>((range) => {
    const sentenceAnchors = anchors.filter(
      (anchor) =>
        anchor.transcriptIndex >= range.tokenStart &&
        anchor.transcriptIndex < range.tokenEnd,
    );
    const normalizedIndices = transcriptTokens
      .slice(range.tokenStart, range.tokenEnd)
      .map((token, index) => (normalizeText(token) ? range.tokenStart + index : -1))
      .filter((index) => index >= 0);
    const matchedCount = sentenceAnchors.length;
    const coverage = matchedCount / Math.max(1, normalizedIndices.length);
    const anchorSpan =
      matchedCount > 1
        ? sentenceAnchors.at(-1)!.transcriptIndex -
          sentenceAnchors[0].transcriptIndex +
          1
        : matchedCount;
    const spanCoverage = anchorSpan / Math.max(1, range.tokenEnd - range.tokenStart);
    const reliable =
      normalizedIndices.length <= 2
        ? matchedCount >= 1
        : matchedCount >= 2 &&
          coverage >= 0.35 &&
          (matchedCount >= 3 || spanCoverage >= 0.5);

    return {
      ...range,
      reliable,
      weight: sentenceWeight(
        transcriptTokens.slice(range.tokenStart, range.tokenEnd),
      ),
      wordCount: normalizedIndices.length,
      start: aligned[range.tokenStart].start,
      end: aligned[range.tokenEnd - 1].end,
      group: Symbol("timeline-sentence"),
    };
  });
  if (plans.length === 0) return aligned;

  const reliableIndices = plans
    .map((plan, index) => (plan.reliable ? index : -1))
    .filter((index) => index >= 0);
  if (reliableIndices.length === 0) {
    allocatePlans(
      plans,
      0,
      plans.length,
      timingWords[0].start,
      timingWords.at(-1)?.end ?? timingWords[0].end,
    );
  } else {
    let runStart = 0;
    let previousReliableIndex: number | undefined;
    for (const reliableIndex of reliableIndices) {
      if (runStart < reliableIndex) {
        planUnreliableRun(
          plans,
          runStart,
          reliableIndex,
          previousReliableIndex,
          reliableIndex,
          timingWords,
        );
      }
      previousReliableIndex = reliableIndex;
      runStart = reliableIndex + 1;
    }
    if (runStart < plans.length) {
      planUnreliableRun(
        plans,
        runStart,
        plans.length,
        previousReliableIndex,
        undefined,
        timingWords,
      );
    }
  }

  for (const plan of plans) {
    const tokenCount = plan.tokenEnd - plan.tokenStart;
    for (let offset = 0; offset < tokenCount; offset++) {
      const progress = offset / tokenCount;
      const nextProgress = (offset + 1) / tokenCount;
      aligned[plan.tokenStart + offset] = {
        ...aligned[plan.tokenStart + offset],
        start: plan.start + progress * (plan.end - plan.start),
        end: plan.start + nextProgress * (plan.end - plan.start),
        timelineGroup: plan.group,
      };
    }
  }
  return aligned;
}

function sentenceRanges(tokens: string[]) {
  const ranges: Array<{ tokenStart: number; tokenEnd: number }> = [];
  let tokenStart = 0;
  for (let index = 0; index < tokens.length; index++) {
    if (SENTENCE_END.test(tokens[index].trim()) || index - tokenStart + 1 >= 60) {
      ranges.push({ tokenStart, tokenEnd: index + 1 });
      tokenStart = index + 1;
    }
  }
  if (tokenStart < tokens.length) {
    ranges.push({ tokenStart, tokenEnd: tokens.length });
  }
  return ranges;
}

function sentenceWeight(tokens: string[]): number {
  return tokens.reduce((weight, token) => {
    const letters = normalizeText(token).length;
    const pause = /[.!?…][”’"')\]]*$/u.test(token)
      ? 3
      : /[,;:][”’"')\]]*$/u.test(token)
        ? 1
        : 0;
    return weight + Math.max(1, letters / 4) + pause;
  }, 0);
}

function planUnreliableRun(
  plans: SentencePlan[],
  startIndex: number,
  endIndex: number,
  previousReliableIndex: number | undefined,
  nextReliableIndex: number | undefined,
  timingWords: TimedWord[],
) {
  const rangeStart =
    previousReliableIndex === undefined
      ? timingWords[0].start
      : plans[previousReliableIndex].end;
  const rangeEnd =
    nextReliableIndex === undefined
      ? (timingWords.at(-1)?.end ?? timingWords[0].end)
      : plans[nextReliableIndex].start;
  const availableDuration = Math.max(0, rangeEnd - rangeStart);
  const run = plans.slice(startIndex, endIndex);
  const minimumDuration = run.reduce(
    (duration, plan) => duration + plan.wordCount * 0.1 + 0.08,
    0,
  );

  if (availableDuration >= minimumDuration) {
    allocatePlans(plans, startIndex, endIndex, rangeStart, rangeEnd);
    return;
  }

  const totalWeight = run.reduce((total, plan) => total + plan.weight, 0);
  let consumedWeight = 0;
  for (let index = startIndex; index < endIndex; index++) {
    const plan = plans[index];
    consumedWeight += plan.weight / 2;
    const attachToPrevious =
      previousReliableIndex !== undefined &&
      (nextReliableIndex === undefined || consumedWeight <= totalWeight / 2);
    const targetIndex = attachToPrevious
      ? previousReliableIndex
      : nextReliableIndex;
    if (targetIndex === undefined) {
      allocatePlans(plans, startIndex, endIndex, rangeStart, rangeEnd);
      return;
    }
    plan.start = plans[targetIndex].start;
    plan.end = plans[targetIndex].end;
    plan.group = plans[targetIndex].group;
    consumedWeight += plan.weight / 2;
  }
}

function allocatePlans(
  plans: SentencePlan[],
  startIndex: number,
  endIndex: number,
  startTime: number,
  endTime: number,
) {
  const totalWeight = plans
    .slice(startIndex, endIndex)
    .reduce((total, plan) => total + plan.weight, 0);
  let cursor = startTime;
  for (let index = startIndex; index < endIndex; index++) {
    const plan = plans[index];
    const isLast = index === endIndex - 1;
    const duration =
      totalWeight > 0
        ? ((endTime - startTime) * plan.weight) / totalWeight
        : 0;
    plan.start = cursor;
    plan.end = isLast ? endTime : cursor + duration;
    cursor = plan.end;
  }
}

export function timedWordsToSentences(words: TimedWord[]): TimedSentence[] {
  const sentences: TimedSentence[] = [];
  const sentenceGroups: Array<symbol | undefined> = [];
  let sentenceWords: TimedWord[] = [];

  function flush() {
    if (sentenceWords.length === 0) return;
    const text = joinWords(sentenceWords.map((word) => word.word));
    if (text) {
      const group = sentenceWords[0].timelineGroup;
      const previous = sentences.at(-1);
      if (group && previous && sentenceGroups.at(-1) === group) {
        previous.text = `${previous.text} ${text}`;
        previous.start = Math.min(previous.start, sentenceWords[0].start);
        previous.end = Math.max(
          previous.end,
          sentenceWords.at(-1)?.end ?? sentenceWords[0].end,
        );
      } else {
        sentences.push({
          text,
          start: sentenceWords[0].start,
          end: sentenceWords.at(-1)?.end ?? sentenceWords[0].end,
        });
        sentenceGroups.push(group);
      }
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
