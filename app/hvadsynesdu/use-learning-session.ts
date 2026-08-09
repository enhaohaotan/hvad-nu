"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PROFILE,
  QUESTIONS,
  STORAGE_KEYS,
  STORAGE_LIMITS,
} from "./constants";
import { parseArray, parseObject, toDateKey } from "./storage";
import type {
  ChatMessage,
  LearnerProfile,
  LearningSession,
  SavedExpression,
  SavedMistake,
} from "./types";

export function useLearningSession() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [history, setHistory] = useState<LearningSession[]>([]);
  const [expressions, setExpressions] = useState<SavedExpression[]>([]);
  const [mistakes, setMistakes] = useState<SavedMistake[]>([]);
  const [profile, setProfile] = useState<LearnerProfile>(DEFAULT_PROFILE);
  const [apiKey, setApiKey] = useState("");
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isContactCopied, setIsContactCopied] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const discussionRef = useRef<HTMLElement | null>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionCounterRef = useRef(0);

  const progress = session?.completedAt
    ? 100
    : session?.phase === "reading"
      ? 20
      : session?.phase === "thinking"
        ? 40
        : session?.phase === "discussing"
          ? 65
          : session
            ? 88
            : 0;

  const savedExpressionNames = useMemo(
    () => new Set(expressions.map((item) => item.expression)),
    [expressions],
  );

  useEffect(() => {
    let storedHistory: LearningSession[] = [];
    let storedExpressions: SavedExpression[] = [];
    let storedMistakes: SavedMistake[] = [];
    let storedProfile: LearnerProfile | null = null;
    let storedApiKey = "";

    try {
      storedHistory = parseArray(localStorage.getItem(STORAGE_KEYS.history));
      storedExpressions = parseArray(
        localStorage.getItem(STORAGE_KEYS.expressions),
      );
      storedMistakes = parseArray(localStorage.getItem(STORAGE_KEYS.mistakes));
      storedProfile = parseObject(localStorage.getItem(STORAGE_KEYS.profile));
      storedApiKey = localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
    } catch {
      // The demo remains usable when browser storage is unavailable.
    }

    const frame = requestAnimationFrame(() => {
      setHistory(storedHistory.slice(0, STORAGE_LIMITS.sessions));
      setExpressions(storedExpressions.slice(0, STORAGE_LIMITS.expressions));
      setMistakes(storedMistakes.slice(0, STORAGE_LIMITS.mistakes));
      setProfile(storedProfile ?? DEFAULT_PROFILE);
      setApiKey(storedApiKey);
      setIsApiKeySaved(Boolean(storedApiKey));
      setHasLoaded(true);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
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
    try {
      localStorage.setItem(STORAGE_KEYS.apiKey, apiKey.trim());
    } catch {
      // The key remains available for this visit when storage is unavailable.
    }
    setApiKey(apiKey.trim());
    setIsApiKeySaved(true);

    const date = toDateKey(new Date());
    const previous = history.find((item) => item.date === date);
    if (previous) {
      setSession(previous);
      return;
    }

    actionCounterRef.current += 1;
    persistHistory({
      id: `session-${date}`,
      date,
      title: "Er den stille kupé blevet for stille?",
      phase: "reading",
      questionIndex: 0,
      messages: [],
      updatedAt: actionCounterRef.current,
    });
    markNewestExpressionAsReused();
  }

  function moveToThinking() {
    if (!session) return;
    persistHistory({ ...session, phase: "thinking", updatedAt: Date.now() });
    requestAnimationFrame(() =>
      document.getElementById("samtalestart")?.scrollIntoView({ block: "start" }),
    );
  }

  function startDiscussion() {
    if (!session) return;
    const firstMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      text: "Lad os tage udgangspunkt i din egen erfaring. Du behøver ikke skrive perfekt — jeg hjælper dig med at gøre sproget skarpere undervejs.",
      question: QUESTIONS[0],
    };
    persistHistory({
      ...session,
      phase: "discussing",
      messages: session.messages.length ? session.messages : [firstMessage],
      updatedAt: Date.now(),
    });
    requestAnimationFrame(() =>
      discussionRef.current?.scrollIntoView({ block: "start" }),
    );
  }

  function sendMessage() {
    if (!session || !draft.trim() || isReplying) return;
    actionCounterRef.current += 1;
    const actionId = actionCounterRef.current;
    const answer = draft.trim();
    const userMessage: ChatMessage = {
      id: `user-${session.id}-${actionId}`,
      role: "user",
      text: answer,
    };
    const withUser: LearningSession = {
      ...session,
      messages: [...session.messages, userMessage].slice(
        -STORAGE_LIMITS.messagesPerSession,
      ),
      updatedAt: session.updatedAt + actionId,
    };
    persistHistory(withUser);
    setDraft("");
    setIsReplying(true);

    replyTimerRef.current = setTimeout(() => {
      const hasCorrection = /enig med|interesseret for|på en måde at/iu.test(answer);
      const nextQuestionIndex = Math.min(
        session.questionIndex + 1,
        QUESTIONS.length - 1,
      );
      const reply: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: hasCorrection
          ? "Din pointe står klart. En lille rettelse: På dansk siger vi typisk “enig i idéen” — ikke “enig med idéen”. Prøv nu at gøre dit kriterium mere præcist."
          : "Det giver mening. Du får tydeligt både individets og fællesskabets behov med. Et sprogligt løft kunne være at indlede med “Det afgørende er, om …” og derefter nævne dit kriterium.",
        question:
          session.questionIndex < QUESTIONS.length - 1
            ? QUESTIONS[nextQuestionIndex]
            : "Kan du samle dit synspunkt i to sætninger og bruge en af dagens vendinger?",
      };
      persistHistory({
        ...withUser,
        phase: "feedback",
        questionIndex: nextQuestionIndex,
        messages: [...withUser.messages, reply].slice(
          -STORAGE_LIMITS.messagesPerSession,
        ),
        updatedAt: Date.now(),
      });
      if (hasCorrection) recordMistake("enig med idéen", "enig i idéen");
      saveExpression(
        "Det afgørende er, om …",
        "bruges til at fremhæve det vigtigste kriterium",
        "Feedback fra dagens samtale",
      );
      setIsReplying(false);
    }, 650);
  }

  function completeSession() {
    if (!session) return;
    persistHistory({
      ...session,
      phase: "feedback",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    showSaveNotice("Dagens læring er gemt til en senere session.", 2600);
  }

  function saveExpression(
    expression: string,
    meaning: string,
    source = "Dagens tekst",
  ) {
    setExpressions((current) => {
      if (current.some((item) => item.expression === expression)) return current;
      const next = [
        {
          id: `expression-${Date.now()}-${expression}`,
          expression,
          meaning,
          source,
          savedAt: Date.now(),
          timesReused: 0,
        },
        ...current,
      ].slice(0, STORAGE_LIMITS.expressions);
      try {
        localStorage.setItem(STORAGE_KEYS.expressions, JSON.stringify(next));
      } catch {
        // Keep the expression in memory if storage is unavailable.
      }
      return next;
    });
    showSaveNotice(`“${expression}” er gemt.`, 1900);
  }

  function markNewestExpressionAsReused() {
    setExpressions((current) => {
      if (!current.length) return current;
      const next = current.map((item, index) =>
        index === 0 ? { ...item, timesReused: item.timesReused + 1 } : item,
      );
      try {
        localStorage.setItem(STORAGE_KEYS.expressions, JSON.stringify(next));
      } catch {
        // The reuse count can remain in memory when storage is unavailable.
      }
      return next;
    });
  }

  function recordMistake(pattern: string, correction: string) {
    setMistakes((current) => {
      const previous = current.find((item) => item.pattern === pattern);
      const nextItem: SavedMistake = previous
        ? { ...previous, count: previous.count + 1, lastSeen: Date.now() }
        : {
            id: `mistake-${pattern}`,
            pattern,
            correction,
            count: 1,
            lastSeen: Date.now(),
          };
      const next = [
        nextItem,
        ...current.filter((item) => item.pattern !== pattern),
      ].slice(0, STORAGE_LIMITS.mistakes);
      try {
        localStorage.setItem(STORAGE_KEYS.mistakes, JSON.stringify(next));
      } catch {
        // Keep the pattern in memory if storage is unavailable.
      }
      return next;
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

  function showSaveNotice(message: string, duration: number) {
    setSaveNotice(message);
    setTimeout(() => setSaveNotice(""), duration);
  }

  return {
    apiKey,
    completeSession,
    copyContactEmail,
    discussionRef,
    draft,
    expressions,
    hasLoaded,
    history,
    isApiKeySaved,
    isContactCopied,
    isReplying,
    mistakes,
    moveToThinking,
    profile,
    progress,
    saveExpression,
    saveNotice,
    saveProfile,
    savedExpressionNames,
    sendMessage,
    session,
    setDraft,
    startDiscussion,
    startToday,
    updateApiKey,
    forgetApiKey,
  };
}
