"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_PROFILE, STORAGE_KEYS, STORAGE_LIMITS } from "./constants";
import { DAILY_READING } from "./daily-content";
import { parseArray, parseObject, toDateKey } from "./storage";
import type { LearnerProfile, LearningSession } from "./types";

export function useLearningSession() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [todayLabel, setTodayLabel] = useState("I dag");
  const [session, setSession] = useState<LearningSession | null>(null);
  const [history, setHistory] = useState<LearningSession[]>([]);
  const [profile, setProfile] = useState<LearnerProfile>(DEFAULT_PROFILE);
  const [apiKey, setApiKey] = useState("");
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [isContactCopied, setIsContactCopied] = useState(false);
  const actionCounterRef = useRef(0);

  useEffect(() => {
    let storedHistory: LearningSession[] = [];
    let storedProfile: LearnerProfile | null = null;
    let storedApiKey = "";

    try {
      storedHistory = parseArray(localStorage.getItem(STORAGE_KEYS.history));
      storedProfile = parseObject(localStorage.getItem(STORAGE_KEYS.profile));
      storedApiKey = localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
    } catch {
      // The page remains usable when browser storage is unavailable.
    }

    const frame = requestAnimationFrame(() => {
      setHistory(storedHistory.slice(0, STORAGE_LIMITS.sessions));
      setProfile(storedProfile ?? DEFAULT_PROFILE);
      setApiKey(storedApiKey);
      setIsApiKeySaved(Boolean(storedApiKey));
      setTodayLabel(
        new Intl.DateTimeFormat("da-DK", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date()),
      );
      setHasLoaded(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  function persistHistory(nextSession: LearningSession) {
    setSession(nextSession);
    setHistory((current) => {
      const next = [
        nextSession,
        ...current.filter((item) => item.id !== nextSession.id),
      ].slice(0, STORAGE_LIMITS.sessions);
      try {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next));
      } catch {
        // Keep the session in memory if storage is full or unavailable.
      }
      return next;
    });
  }

  function startToday() {
    if (!apiKey.trim()) return;
    const savedKey = apiKey.trim();
    try {
      localStorage.setItem(STORAGE_KEYS.apiKey, savedKey);
    } catch {
      // The key remains available for this visit when storage is unavailable.
    }
    setApiKey(savedKey);
    setIsApiKeySaved(true);

    const date = toDateKey(new Date());
    const previous = history.find((item) => item.date === date);
    if (previous) {
      setSession(previous);
      setDraft(previous.answer ?? "");
      return;
    }

    actionCounterRef.current += 1;
    persistHistory({
      id: `session-${date}`,
      date,
      title: DAILY_READING.title,
      answer: "",
      updatedAt: actionCounterRef.current,
    });
    setDraft("");
  }

  function updateDraft(value: string) {
    setDraft(value);
    if (!session) return;
    actionCounterRef.current += 1;
    persistHistory({
      ...session,
      answer: value,
      updatedAt: Math.max(session.updatedAt + 1, actionCounterRef.current),
    });
  }

  function saveProfile(next: LearnerProfile) {
    const updated = { ...next, updatedAt: Date.now() };
    setProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updated));
    } catch {
      // The profile still remains available during this visit.
    }
  }

  function updateApiKey(value: string) {
    setApiKey(value);
  }

  function forgetApiKey() {
    setApiKey("");
    setIsApiKeySaved(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.apiKey);
    } catch {
      // The field remains usable for this visit.
    }
  }

  async function copyContactEmail() {
    await navigator.clipboard.writeText("enhaohao.tan@gmail.com");
    setIsContactCopied(true);
    setTimeout(() => setIsContactCopied(false), 2000);
  }

  return {
    apiKey,
    copyContactEmail,
    draft,
    forgetApiKey,
    hasLoaded,
    isApiKeySaved,
    isContactCopied,
    profile,
    saveProfile,
    session,
    startToday,
    todayLabel,
    updateApiKey,
    updateDraft,
  };
}
