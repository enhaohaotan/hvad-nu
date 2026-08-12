"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PROFILE, EMPTY_SESSION_STORE, STORAGE_KEYS } from "./constants";
import { mergeProfile } from "./profile";
import { addSession, parseProfile, parseSessionStore, toDateKey } from "./storage";
import type { DanishLevel, FeedbackResult, GeneratedContent, LearnerProfile, LearningSession, SessionStore } from "./types";

export function useLearningSession() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [todayLabel, setTodayLabel] = useState("I dag");
  const [store, setStore] = useState<SessionStore>(EMPTY_SESSION_STORE);
  const [profile, setProfile] = useState<LearnerProfile>(DEFAULT_PROFILE);
  const [apiKey, setApiKey] = useState("");
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [isReadingCopied, setIsReadingCopied] = useState(false);
  const [isContactCopied, setIsContactCopied] = useState(false);

  useEffect(() => {
    let nextStore = EMPTY_SESSION_STORE;
    let nextProfile = DEFAULT_PROFILE;
    let storedApiKey = "";
    try {
      nextStore = parseSessionStore(localStorage.getItem(STORAGE_KEYS.sessions));
      nextProfile = parseProfile(localStorage.getItem(STORAGE_KEYS.profile) ?? localStorage.getItem(STORAGE_KEYS.legacyProfile));
      storedApiKey = localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
    } catch {
      // The page remains usable when browser storage is unavailable.
    }
    const frame = requestAnimationFrame(() => {
      setStore(nextStore);
      setProfile(nextProfile);
      setApiKey(storedApiKey);
      setIsApiKeySaved(Boolean(storedApiKey));
      setTodayLabel(new Intl.DateTimeFormat("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()));
      setHasLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const session = useMemo(
    () => store.sessions.find((item) => item.id === store.activeSessionId) ?? store.sessions[0] ?? null,
    [store],
  );
  const todayCount = store.sessions.filter((item) => item.dateKey === toDateKey(new Date())).length;

  function persistStore(next: SessionStore) {
    setStore(next);
    try { localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(next)); } catch { /* keep in memory */ }
  }

  function persistProfile(next: LearnerProfile) {
    setProfile(next);
    try { localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(next)); } catch { /* keep in memory */ }
  }

  function updateLevel(level: DanishLevel) {
    persistProfile({ ...profile, selectedLevel: level, updatedAt: Date.now() });
  }

  async function generateSession() {
    const savedKey = apiKey.trim();
    if (!savedKey || isGenerating) return;
    setIsGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/hvadsynesdu/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${savedKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          level: profile.selectedLevel,
          targetLevel: profile.targetLevel,
          recentTopics: store.sessions.map((item) => `${item.content.reading.category}: ${item.content.reading.title}`).slice(0, 10),
        }),
      });
      const body = await response.json() as { content?: GeneratedContent; error?: string };
      if (!response.ok || !body.content) throw new Error(body.error || "Sessionen kunne ikke oprettes.");
      const now = Date.now();
      const nextSession: LearningSession = {
        id: crypto.randomUUID(),
        createdAt: now,
        dateKey: toDateKey(new Date(now)),
        level: profile.selectedLevel,
        content: body.content,
        conversation: [],
        draft: "",
      };
      persistStore(addSession(store, nextSession));
      try { localStorage.setItem(STORAGE_KEYS.apiKey, savedKey); } catch { /* keep in memory */ }
      setApiKey(savedKey);
      setIsApiKeySaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sessionen kunne ikke oprettes.");
    } finally {
      setIsGenerating(false);
    }
  }

  function selectSession(id: string) {
    persistStore({ ...store, activeSessionId: id });
    setError("");
  }

  function updateDraft(value: string) {
    if (!session) return;
    updateSession({ ...session, draft: value.slice(0, 6000) });
  }

  async function sendAnswer() {
    if (!session?.draft.trim() || isSending) return;
    setIsSending(true);
    setError("");
    const answer = session.draft.trim();
    try {
      const response = await fetch("/api/hvadsynesdu/feedback", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          level: session.level,
          targetLevel: profile.targetLevel,
          content: session.content,
          profile,
          answer,
          previousTurns: session.conversation.map((turn) => ({ userAnswer: turn.userAnswer, reply: turn.feedback.reply })),
        }),
      });
      const body = await response.json() as { feedback?: FeedbackResult; error?: string };
      if (!response.ok || !body.feedback) throw new Error(body.error || "Svaret kunne ikke behandles.");
      const nextSession: LearningSession = {
        ...session,
        draft: "",
        conversation: [...session.conversation, { id: crypto.randomUUID(), createdAt: session.createdAt + session.conversation.length + 1, userAnswer: answer, feedback: body.feedback }],
      };
      updateSession(nextSession);
      persistProfile(mergeProfile(profile, body.feedback.profileUpdate));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Svaret kunne ikke behandles.");
    } finally {
      setIsSending(false);
    }
  }

  function updateSession(nextSession: LearningSession) {
    persistStore({
      ...store,
      activeSessionId: nextSession.id,
      sessions: store.sessions.map((item) => item.id === nextSession.id ? nextSession : item),
    });
  }

  function forgetApiKey() {
    setApiKey("");
    setIsApiKeySaved(false);
    try { localStorage.removeItem(STORAGE_KEYS.apiKey); } catch { /* field stays usable */ }
  }

  async function copyContactEmail() {
    await navigator.clipboard.writeText("enhaohao.tan@gmail.com");
    setIsContactCopied(true);
    setTimeout(() => setIsContactCopied(false), 2000);
  }

  async function copyReading() {
    if (!session) return;
    await navigator.clipboard.writeText(session.content.reading.paragraphs.join("\n\n"));
    setIsReadingCopied(true);
    setTimeout(() => setIsReadingCopied(false), 2000);
  }

  function downloadReading() {
    if (!session) return;
    const href = URL.createObjectURL(new Blob([session.content.reading.paragraphs.join("\n\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `${slug(session.content.reading.title)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return {
    apiKey, copyContactEmail, copyReading, downloadReading, error, forgetApiKey,
    generateSession, hasLoaded, history: store.sessions, isApiKeySaved, isContactCopied,
    isGenerating, isReadingCopied, isSending, profile, selectSession, sendAnswer,
    session, todayCount, todayLabel, updateApiKey: setApiKey, updateDraft, updateLevel,
  };
}

function slug(value: string) {
  return value.toLocaleLowerCase("da-DK").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "dagens-laesning";
}
