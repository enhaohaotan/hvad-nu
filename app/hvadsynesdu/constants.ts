import type { LearnerProfile } from "./types";

export const STORAGE_KEYS = {
  history: "hvad-synes-du:sessions.v1",
  expressions: "hvad-synes-du:expressions.v1",
  mistakes: "hvad-synes-du:mistakes.v1",
  profile: "hvad-synes-du:profile.v1",
  apiKey: "hvad-synes-du:openai-api-key",
} as const;

export const STORAGE_LIMITS = {
  sessions: 14,
  messagesPerSession: 80,
  expressions: 60,
  mistakes: 30,
} as const;

export const DEFAULT_PROFILE: LearnerProfile = {
  level: "B2",
  updatedAt: 0,
};

export const DISCUSSION_EXPRESSIONS = [
  ["På den ene side … på den anden side …", "når du vil afveje to hensyn"],
  ["Jeg kan godt følge tanken, men …", "når du vil være uenig på en blød måde"],
  ["Det afgørende er, om …", "når du vil fremhæve dit vigtigste kriterium"],
  ["Der bør være plads til …", "når du vil forsvare et behov eller en gruppe"],
] as const;

export const QUESTIONS = [
  "Hvornår er det rimeligt at bede andre om at være stille?",
  "Er tydelige regler bedre end social forståelse i fælles rum?",
  "Hvordan kan man sige fra uden at skabe en unødvendig konflikt?",
] as const;
