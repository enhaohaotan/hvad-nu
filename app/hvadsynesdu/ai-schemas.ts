import { LANGUAGE_CATEGORIES } from "./types";

const stringArray = { type: "array", items: { type: "string" } } as const;
const category = { type: "string", enum: [...LANGUAGE_CATEGORIES] } as const;

const object = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const CONTENT_SCHEMA = object({
  reading: object({
    category: { type: "string" },
    title: { type: "string" },
    estimatedMinutes: { type: "number" },
    levelLabel: { type: "string" },
    paragraphs: stringArray,
    source: {
      anyOf: [
        object({
          publisher: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          publishedAt: { type: "string" },
          adaptationNote: { type: "string" },
        }),
        { type: "null" },
      ],
    },
  }),
  discussion: object({
    title: { type: "string" },
    introduction: stringArray,
    expressions: {
      type: "array",
      items: object({ expression: { type: "string" }, explanation: { type: "string" } }),
    },
    questions: stringArray,
  }),
});

export const FEEDBACK_SCHEMA = object({
  reply: { type: "string" },
  corrections: {
    type: "array",
    items: object({
      category,
      original: { type: "string" },
      corrected: { type: "string" },
      explanation: { type: "string" },
      recurring: { type: "boolean" },
    }),
  },
  upgrades: {
    type: "array",
    items: object({
      category,
      original: { type: "string" },
      improved: { type: "string" },
      explanation: { type: "string" },
    }),
  },
  revisedVersion: { type: "string" },
  followUpQuestion: { type: "string" },
  profileUpdate: object({
    estimatedWritingLevel: { type: ["string", "null"] },
    strengthsObserved: stringArray,
    patternsObserved: {
      type: "array",
      items: object({
        category,
        pattern: { type: "string" },
        guidance: { type: "string" },
      }),
    },
    expressionsIntroduced: {
      type: "array",
      items: object({ expression: { type: "string" }, explanation: { type: "string" } }),
    },
    expressionsUsedCorrectly: stringArray,
    currentPriorities: stringArray,
  }),
});
