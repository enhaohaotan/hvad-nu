import type { LearnerProfile, SessionStore } from "./types.ts";

export const STORAGE_KEYS = {
  sessions: "hvad-synes-du:sessions.v2",
  profile: "hvad-synes-du:profile.v2",
  legacyProfile: "hvad-synes-du:profile.v1",
  apiKey: "hvad-synes-du:openai-api-key",
} as const;

export const STORAGE_LIMITS = {
  sessions: 10,
  strengths: 8,
  patterns: 12,
  expressions: 20,
  priorities: 5,
} as const;

export const DEFAULT_PROFILE: LearnerProfile = {
  version: 1,
  updatedAt: 0,
  selectedLevel: "B2",
  targetLevel: "C1",
  estimatedWritingLevel: "Ikke vurderet endnu",
  strengths: [],
  recurringPatterns: [],
  activeExpressions: [],
  currentPriorities: [],
};

export const EMPTY_SESSION_STORE: SessionStore = {
  version: 2,
  activeSessionId: null,
  sessions: [],
};
