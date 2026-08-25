export type InterlinearSentence = {
  text: string;
  translation: string;
};

export type InterlinearSegment = {
  sentenceIndex: number;
  sourceStart: number;
  gapAfter: number;
  text: string;
  translation: string;
};

export type InterlinearLine = {
  segments: InterlinearSegment[];
};

type MutableSegment = InterlinearSegment & {
  sourceLength: number;
};

type MutableLine = {
  segments: MutableSegment[];
  extraWidth: number;
  text: string;
};

export function createInterlinearLines(
  sentences: InterlinearSentence[],
  maxWidth: number,
  measureText: (text: string) => number,
  language: string,
  measureTranslation: (text: string) => number = measureText,
): InterlinearLine[] {
  if (maxWidth <= 0) return [];

  const lines: MutableLine[] = [];
  let current: MutableLine = { segments: [], extraWidth: 0, text: "" };

  function addPart(sentenceIndex: number, part: string, continuesWord: boolean) {
    const previousSegment = current.segments.at(-1);
    const sentenceChanges =
      previousSegment !== undefined &&
      previousSegment.sentenceIndex !== sentenceIndex;
    const sentenceGap = sentenceChanges
      ? requiredGapAfter(previousSegment)
      : 0;
    const separator = current.text && !continuesWord ? " " : "";
    const candidate = `${current.text}${separator}${part}`;

    if (
      current.text &&
      measureText(candidate) + current.extraWidth + sentenceGap > maxWidth
    ) {
      lines.push(current);
      current = { segments: [], extraWidth: 0, text: "" };
    } else if (sentenceChanges && previousSegment) {
      previousSegment.gapAfter = sentenceGap;
      current.extraWidth += sentenceGap;
    }

    const nextSeparator = current.text && !continuesWord ? " " : "";
    current.text += `${nextSeparator}${part}`;

    const previous = current.segments.at(-1);
    if (previous?.sentenceIndex === sentenceIndex) {
      previous.text += `${nextSeparator}${part}`;
      previous.sourceLength += Array.from(part).length;
      return;
    }

    current.segments.push({
      sentenceIndex,
      sourceStart: measureText(
        current.text.slice(0, current.text.length - part.length),
      ) + current.extraWidth,
      gapAfter: 0,
      text: part,
      translation: "",
      sourceLength: Array.from(part).length,
    });
  }

  function requiredGapAfter(segment: MutableSegment): number {
    const sentence = sentences[segment.sentenceIndex];
    const sentenceSegments = [...lines, current].flatMap((line) =>
      line.segments.filter(
        (candidate) => candidate.sentenceIndex === segment.sentenceIndex,
      ),
    );
    const totalSourceLength = sentenceSegments.reduce(
      (total, candidate) => total + candidate.sourceLength,
      0,
    );
    const boundaries = findTranslationBoundaries(sentence.translation, language);
    let consumedSource = 0;
    let translationStart = 0;

    for (const candidate of sentenceSegments) {
      if (candidate === segment) break;
      consumedSource += candidate.sourceLength;
      const idealEnd = Math.round(
        (consumedSource / totalSourceLength) * sentence.translation.length,
      );
      translationStart = nearestBoundary(boundaries, idealEnd, translationStart);
    }

    return Math.max(
      0,
      measureTranslation(sentence.translation.slice(translationStart)) -
        measureText(`${segment.text} `),
    );
  }

  for (const [sentenceIndex, sentence] of sentences.entries()) {
    for (const word of sentence.text.match(/\S+/gu) ?? []) {
      const parts = splitOversizedWord(word, maxWidth, measureText);
      for (const [partIndex, part] of parts.entries()) {
        addPart(sentenceIndex, part, partIndex > 0);
      }
    }
  }

  if (current.text) lines.push(current);

  for (const [sentenceIndex, sentence] of sentences.entries()) {
    const segments = lines.flatMap((line) =>
      line.segments.filter((segment) => segment.sentenceIndex === sentenceIndex),
    );
    const totalSourceLength = segments.reduce(
      (total, segment) => total + segment.sourceLength,
      0,
    );
    const boundaries = findTranslationBoundaries(sentence.translation, language);
    let consumedSource = 0;
    let translationStart = 0;

    for (const [segmentIndex, segment] of segments.entries()) {
      consumedSource += segment.sourceLength;
      const isLast = segmentIndex === segments.length - 1;
      const idealEnd = Math.round(
        (consumedSource / totalSourceLength) * sentence.translation.length,
      );
      const translationEnd = isLast
        ? sentence.translation.length
        : nearestBoundary(boundaries, idealEnd, translationStart);

      segment.translation = sentence.translation.slice(
        translationStart,
        translationEnd,
      );
      translationStart = translationEnd;
    }
  }

  return lines.map((line) => ({
    segments: line.segments.map((segment) => ({
      sentenceIndex: segment.sentenceIndex,
      sourceStart: segment.sourceStart,
      gapAfter: segment.gapAfter,
      text: segment.text,
      translation: segment.translation,
    })),
  }));
}

function splitOversizedWord(
  word: string,
  maxWidth: number,
  measureText: (text: string) => number,
): string[] {
  if (measureText(word) <= maxWidth) return [word];

  const parts: string[] = [];
  let current = "";

  for (const character of word) {
    const candidate = `${current}${character}`;
    if (current && measureText(candidate) > maxWidth) {
      parts.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current) parts.push(current);
  return parts;
}

function findTranslationBoundaries(value: string, language: string): number[] {
  if (typeof Intl.Segmenter !== "function") {
    return Array.from(value, (_, index) => index + 1);
  }

  return Array.from(
    new Intl.Segmenter(language, { granularity: "word" }).segment(value),
    (segment) => segment.index + segment.segment.length,
  );
}

function nearestBoundary(
  boundaries: number[],
  target: number,
  minimum: number,
): number {
  let nearest = minimum;
  let nearestDistance = Math.abs(target - minimum);

  for (const boundary of boundaries) {
    if (boundary < minimum) continue;

    const distance = Math.abs(target - boundary);
    if (distance < nearestDistance) {
      nearest = boundary;
      nearestDistance = distance;
    }
    if (boundary >= target && distance >= nearestDistance) break;
  }

  return nearest;
}
