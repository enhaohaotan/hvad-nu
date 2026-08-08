const MAX_OVERLAP_WORDS = 80;

export function mergeTranscriptParts(left: string, right: string): string {
  const normalizedLeft = normalizeTranscript(left);
  const normalizedRight = normalizeTranscript(right);
  if (!normalizedLeft) return normalizedRight;
  if (!normalizedRight) return normalizedLeft;

  const leftWords = normalizedLeft.split(" ");
  const rightWords = normalizedRight.split(" ");
  const leftKeys = leftWords.map(comparisonKey);
  const rightKeys = rightWords.map(comparisonKey);
  const overlap = findReliableOverlap(leftKeys, rightKeys);
  const remainder = rightWords.slice(overlap).join(" ");
  const mergedLeft = carryContinuationPunctuation(
    normalizedLeft,
    overlap ? rightWords[overlap - 1] : "",
  );

  return remainder ? `${mergedLeft} ${remainder}` : normalizedLeft;
}

function normalizeTranscript(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function comparisonKey(value: string): string {
  return value
    .toLocaleLowerCase("da")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function carryContinuationPunctuation(left: string, boundaryWord: string): string {
  const punctuation = boundaryWord.match(/[,;:]$/u)?.[0];
  if (!punctuation) return left;
  return `${left.replace(/[.!?,;:]+$/u, "")}${punctuation}`;
}

function findReliableOverlap(left: string[], right: string[]): number {
  const maximum = Math.min(
    MAX_OVERLAP_WORDS,
    left.length,
    right.length,
  );

  // A single repeated word may be intentional ("Nej. Nej, ..."). Require at
  // least two matching words before removing text from a transcript boundary.
  for (let size = maximum; size >= 2; size--) {
    const leftStart = left.length - size;
    let matches = true;
    for (let index = 0; index < size; index++) {
      const leftWord = left[leftStart + index];
      const rightWord = right[index];
      if (!leftWord || leftWord !== rightWord) {
        matches = false;
        break;
      }
    }
    if (matches) return size;
  }

  return 0;
}
