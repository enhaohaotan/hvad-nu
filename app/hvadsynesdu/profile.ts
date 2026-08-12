import { STORAGE_LIMITS } from "./constants.ts";
import type { FeedbackResult, LearnerProfile } from "./types.ts";

export function mergeProfile(
  profile: LearnerProfile,
  update: FeedbackResult["profileUpdate"],
  now = Date.now(),
): LearnerProfile {
  const strengths = unique([...update.strengthsObserved, ...profile.strengths]).slice(0, STORAGE_LIMITS.strengths);
  const recurringPatterns = [...profile.recurringPatterns];
  for (const observed of update.patternsObserved) {
    const key = normalize(observed.pattern);
    const index = recurringPatterns.findIndex((item) => normalize(item.pattern) === key);
    if (index >= 0) {
      recurringPatterns[index] = {
        ...recurringPatterns[index],
        category: observed.category,
        guidance: observed.guidance,
        count: recurringPatterns[index].count + 1,
        lastSeen: now,
      };
    } else {
      recurringPatterns.push({ ...observed, count: 1, lastSeen: now });
    }
  }
  recurringPatterns.sort((a, b) => b.lastSeen - a.lastSeen || b.count - a.count);

  const activeExpressions = [...profile.activeExpressions];
  for (const introduced of update.expressionsIntroduced) {
    const index = activeExpressions.findIndex((item) => normalize(item.expression) === normalize(introduced.expression));
    if (index >= 0) activeExpressions[index].introducedCount += 1;
    else activeExpressions.push({ ...introduced, introducedCount: 1, successfulUses: 0 });
  }
  for (const used of update.expressionsUsedCorrectly) {
    const index = activeExpressions.findIndex((item) => normalize(item.expression) === normalize(used));
    if (index >= 0) activeExpressions[index].successfulUses += 1;
  }

  return {
    ...profile,
    updatedAt: now,
    estimatedWritingLevel: update.estimatedWritingLevel ?? profile.estimatedWritingLevel,
    strengths,
    recurringPatterns: recurringPatterns.slice(0, STORAGE_LIMITS.patterns),
    activeExpressions: activeExpressions.slice(-STORAGE_LIMITS.expressions),
    currentPriorities: unique(update.currentPriorities).slice(0, STORAGE_LIMITS.priorities),
  };
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("da-DK");
}

function unique(values: string[]) {
  return [...new Map(values.filter(Boolean).map((value) => [normalize(value), value.trim()])).values()];
}
