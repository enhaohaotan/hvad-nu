import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PROFILE, EMPTY_SESSION_STORE } from "../app/hvadsynesdu/constants.ts";
import { mergeProfile } from "../app/hvadsynesdu/profile.ts";
import { addSession } from "../app/hvadsynesdu/storage.ts";
import type { FeedbackResult, LearningSession } from "../app/hvadsynesdu/types.ts";

function session(id: string, dateKey = "2026-08-12"): LearningSession {
  return {
    id,
    createdAt: Number(id.replace(/\D/g, "")) || 1,
    dateKey,
    level: "B2",
    content: {
      reading: { category: "Samfund", title: `Tekst ${id}`, estimatedMinutes: 10, levelLabel: "B2–C1", paragraphs: ["Tekst"], source: null },
      discussion: { title: "Emne", introduction: ["Intro"], expressions: [], questions: [] },
    },
    conversation: [],
    draft: "",
  };
}

test("keeps multiple sessions from the same day and caps history at ten", () => {
  let store = EMPTY_SESSION_STORE;
  for (let index = 0; index < 12; index += 1) store = addSession(store, session(`s${index}`));
  assert.equal(store.sessions.length, 10);
  assert.equal(store.sessions.filter((item) => item.dateKey === "2026-08-12").length, 10);
  assert.equal(store.sessions[0].id, "s11");
});

test("merges repeated profile patterns deterministically", () => {
  const update: FeedbackResult["profileUpdate"] = {
    estimatedWritingLevel: "B2",
    strengthsObserved: ["Gode eksempler"],
    patternsObserved: [{ category: "prepositions", pattern: "forkert præposition efter afhænge", guidance: "Brug afhænge af." }],
    expressionsIntroduced: [{ expression: "i den forbindelse", explanation: "Knytter en pointe til konteksten." }],
    expressionsUsedCorrectly: [],
    currentPriorities: ["Præpositioner"],
  };
  const once = mergeProfile(DEFAULT_PROFILE, update, 100);
  const twice = mergeProfile(once, update, 200);
  assert.equal(twice.recurringPatterns[0].count, 2);
  assert.equal(twice.recurringPatterns[0].lastSeen, 200);
  assert.equal(twice.activeExpressions[0].introducedCount, 2);
  assert.equal(twice.estimatedWritingLevel, "B2");
});
