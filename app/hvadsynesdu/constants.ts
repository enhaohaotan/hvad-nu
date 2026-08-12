import type { LearnerProfile } from "./types";

export const STORAGE_KEYS = {
  history: "hvad-synes-du:sessions.v1",
  profile: "hvad-synes-du:profile.v1",
  apiKey: "hvad-synes-du:openai-api-key",
} as const;

export const STORAGE_LIMITS = {
  sessions: 14,
} as const;

export const DEFAULT_PROFILE: LearnerProfile = {
  level: "B2",
  updatedAt: 0,
};
