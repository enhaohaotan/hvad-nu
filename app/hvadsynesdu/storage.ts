import { DEFAULT_PROFILE, EMPTY_SESSION_STORE, STORAGE_LIMITS } from "./constants.ts";
import { LEVELS, type DanishLevel, type LearnerProfile, type LearningSession, type SessionStore } from "./types.ts";

export function parseSessionStore(value: string | null): SessionStore {
  if (!value) return EMPTY_SESSION_STORE;
  try {
    const parsed = JSON.parse(value) as Partial<SessionStore>;
    if (parsed.version !== 2 || !Array.isArray(parsed.sessions)) return EMPTY_SESSION_STORE;
    const sessions = parsed.sessions.slice(0, STORAGE_LIMITS.sessions);
    const activeSessionId = typeof parsed.activeSessionId === "string" && sessions.some((session) => session.id === parsed.activeSessionId)
      ? parsed.activeSessionId
      : sessions[0]?.id ?? null;
    return {
      version: 2,
      activeSessionId,
      generationCount: typeof parsed.generationCount === "number" ? parsed.generationCount : parsed.sessions.length,
      sessions: parsed.sessions.slice(0, STORAGE_LIMITS.sessions),
    };
  } catch {
    return EMPTY_SESSION_STORE;
  }
}

export function addSession(store: SessionStore, session: LearningSession): SessionStore {
  return {
    version: 2,
    activeSessionId: session.id,
    generationCount: store.generationCount + 1,
    sessions: [session, ...store.sessions.filter((item) => item.id !== session.id)].slice(0, STORAGE_LIMITS.sessions),
  };
}

export function parseProfile(value: string | null): LearnerProfile {
  if (!value) return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(value) as Partial<LearnerProfile> & { level?: unknown };
    if (parsed.version !== 1 || !isLevel(parsed.selectedLevel)) {
      return isLevel(parsed.level)
        ? { ...DEFAULT_PROFILE, selectedLevel: parsed.level }
        : DEFAULT_PROFILE;
    }
    return { ...DEFAULT_PROFILE, ...parsed } as LearnerProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function isLevel(value: unknown): value is DanishLevel {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
