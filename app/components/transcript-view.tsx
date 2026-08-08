"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TimedSentence } from "@/lib/timed-transcript";
import {
  isTranslationLanguage,
  TRANSLATION_LANGUAGES,
  type TranslationLanguage,
} from "@/lib/translation";
import type { TranscriptionPhase } from "@/lib/transcription-client";

const TRANSLATION_LANGUAGE_STORAGE_KEY = "hvad-sagde-de:translation-language";
const TRANSLATION_CACHE_STORAGE_KEY = "hvad-sagde-de:translations:v1";

type DisplaySentence = {
  text: string;
  start?: number;
  end?: number;
};

type TranslationCacheEntry = {
  key: string;
  translations: string[];
  cachedAt: number;
};

export function TranscriptView({
  episodeTitle,
  transcript,
  timedSentences,
  currentTime,
  isPlayerOpen,
  apiKey,
  phase,
  isCopied,
  onCopy,
  onDownload,
  onSeekTo,
}: {
  episodeTitle?: string;
  transcript: string;
  timedSentences: TimedSentence[];
  currentTime: number;
  isPlayerOpen: boolean;
  apiKey: string;
  phase: TranscriptionPhase;
  isCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onSeekTo: (seconds: number) => void;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationLanguage, setTranslationLanguage] =
    useState<TranslationLanguage>(getInitialTranslationLanguage);
  const [translations, setTranslations] = useState<
    Partial<Record<TranslationLanguage, string[]>>
  >({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const translationAbortRef = useRef<AbortController | null>(null);
  const displaySentences = useMemo<DisplaySentence[]>(
    () =>
      timedSentences.length > 0
        ? timedSentences
        : splitSentences(transcript).map((text) => ({ text })),
    [timedSentences, transcript],
  );
  const activeSentenceIndex = useMemo(() => {
    if (!isPlayerOpen || timedSentences.length === 0) return -1;
    for (let index = timedSentences.length - 1; index >= 0; index--) {
      if (currentTime >= timedSentences[index].start) return index;
    }
    return -1;
  }, [currentTime, isPlayerOpen, timedSentences]);
  const selectedTranslations = translations[translationLanguage];

  useEffect(() => {
    if (!isActionsMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsActionsMenuOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isActionsMenuOpen]);

  useEffect(
    () => () => translationAbortRef.current?.abort(),
    [],
  );

  async function ensureTranslation(language: TranslationLanguage) {
    if (translations[language]?.length === displaySentences.length) return;
    setTranslationError("");
    if (!apiKey) {
      setTranslationError("Indtast din OpenAI API-nøgle for at oversætte.");
      return;
    }

    const cacheKey = makeTranslationCacheKey(transcript, language);
    const cached = readTranslationCache(cacheKey, displaySentences.length);
    if (cached) {
      setTranslations((current) => ({ ...current, [language]: cached }));
      return;
    }

    translationAbortRef.current?.abort();
    const controller = new AbortController();
    translationAbortRef.current = controller;
    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetLanguage: language,
          sentences: displaySentences.map((sentence, id) => ({
            id,
            text: sentence.text,
          })),
        }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        translations?: unknown;
        error?: string;
      } | null;
      if (!response.ok || !Array.isArray(body?.translations)) {
        throw new Error(body?.error || "Transskriptionen kunne ikke oversættes.");
      }
      const result = body.translations.filter(
        (value): value is string => typeof value === "string" && Boolean(value),
      );
      if (result.length !== displaySentences.length) {
        throw new Error("Oversættelsen manglede en eller flere sætninger.");
      }
      setTranslations((current) => ({ ...current, [language]: result }));
      writeTranslationCache(cacheKey, result);
    } catch (error) {
      if (!controller.signal.aborted) {
        setTranslationError(
          error instanceof Error
            ? error.message
            : "Transskriptionen kunne ikke oversættes.",
        );
      }
    } finally {
      if (translationAbortRef.current === controller) {
        translationAbortRef.current = null;
        setIsTranslating(false);
      }
    }
  }

  function toggleTranslation() {
    const nextVisible = !showTranslation;
    setShowTranslation(nextVisible);
    if (nextVisible) void ensureTranslation(translationLanguage);
  }

  function selectLanguage(language: TranslationLanguage) {
    setTranslationLanguage(language);
    try {
      window.localStorage.setItem(TRANSLATION_LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Keep the selection for this session.
    }
    setIsActionsMenuOpen(false);
    if (showTranslation) void ensureTranslation(language);
  }

  return (
    <section
      className="mt-12 border-t-4 border-[#76866f] pt-7 sm:mt-16 sm:pt-9"
      aria-labelledby="transcript-title"
    >
      <div className="border-b border-[#29231b]/40 pb-6 md:pr-[220px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9f211e]">
          Transskriptionen
        </p>
        <h2
          id="transcript-title"
          className="editorial-serif mt-2 max-w-[900px] text-3xl leading-none tracking-[-0.035em] sm:text-5xl"
        >
          {episodeTitle}
        </h2>
      </div>

      {phase === "done" && (
        <div className="sticky top-3 z-30 ml-auto mt-4 w-fit md:-mt-[60px] md:mb-6">
          <div
            className="flex h-10 items-center border border-[#29231b]/35 bg-[#f7f2e8]/95 shadow-[0_7px_20px_rgba(41,35,27,0.14)]"
            role="group"
            aria-label="Oversættelse og teksthandlinger"
          >
            <button
              type="button"
              role="switch"
              aria-checked={showTranslation}
              onClick={toggleTranslation}
              className="group flex h-full shrink-0 items-center gap-3 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#29231b] transition hover:bg-[#29231b] hover:text-[#f8f2e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
              aria-label={`${showTranslation ? "Skjul" : "Vis"} oversættelse`}
            >
              <span>{isTranslating ? "Oversætter…" : "Oversæt"}</span>
              <span
                aria-hidden="true"
                className={`flex h-[18px] w-8 items-center border p-0.5 transition-colors ${
                  showTranslation
                    ? "justify-end border-[#29231b] bg-[#29231b] group-hover:border-[#f8f2e6]/55"
                    : "justify-start border-[#29231b]/45 bg-[#ded7ca] group-hover:border-[#f8f2e6]/55 group-hover:bg-white/10"
                }`}
              >
                <span className="h-3 w-3 shrink-0 bg-[#f8f2e6] shadow-sm" />
              </span>
            </button>
            <div
              ref={actionsMenuRef}
              className="relative h-full border-l border-[#29231b]/20"
            >
              <button
                type="button"
                aria-label="Flere handlinger og sprog"
                aria-haspopup="menu"
                aria-expanded={isActionsMenuOpen}
                onClick={() => setIsActionsMenuOpen((open) => !open)}
                className="flex h-full w-10 items-center justify-center text-lg leading-none text-[#29231b] transition hover:bg-[#29231b] hover:text-[#f8f2e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
              >
                <span aria-hidden="true">⋮</span>
              </button>
              {isActionsMenuOpen && (
                <div
                  role="menu"
                  aria-label="Teksthandlinger og oversættelsessprog"
                  className="absolute right-0 top-[calc(100%+7px)] z-40 min-w-[160px] border border-[#29231b]/30 bg-[#f7f2e8] p-1.5 shadow-[0_10px_26px_rgba(41,35,27,0.18)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onCopy();
                      setIsActionsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-5 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#29231b] transition hover:bg-[#29231b] hover:text-[#f8f2e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
                  >
                    <span>{isCopied ? "Kopieret" : "Kopiér tekst"}</span>
                    <span aria-hidden="true">⧉</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onDownload();
                      setIsActionsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-5 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#29231b] transition hover:bg-[#29231b] hover:text-[#f8f2e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
                  >
                    <span>Hent tekst</span>
                    <span aria-hidden="true">↓</span>
                  </button>
                  <div className="mx-2 my-1.5 border-t border-[#29231b]/25" />
                  <p className="px-3 pb-1 pt-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#70695f]">
                    Oversæt til
                  </p>
                  <div className="editorial-scrollbar -mb-1.5 -mr-1.5 max-h-56 overflow-y-auto">
                    {Object.entries(TRANSLATION_LANGUAGES).map(
                      ([language, label]) => (
                        <button
                          key={language}
                          type="button"
                          role="menuitemradio"
                          aria-checked={translationLanguage === language}
                          onClick={() =>
                            selectLanguage(language as TranslationLanguage)
                          }
                          className={`flex w-full items-center justify-between gap-5 px-3 py-2 text-left text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20 ${
                            translationLanguage === language
                              ? "bg-[#29231b] text-[#f8f2e6]"
                              : "text-[#29231b] hover:bg-[#29231b] hover:text-[#f8f2e6]"
                          }`}
                        >
                          <span>{label}</span>
                          {translationLanguage === language && (
                            <span aria-hidden="true">✓</span>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {translationError && (
            <p
              role="alert"
              className="mt-1.5 max-w-72 border border-[#9f211e]/30 bg-[#f7f2e8]/95 px-2.5 py-2 text-[10px] leading-4 text-[#9f211e] shadow-sm"
            >
              {translationError}
            </p>
          )}
        </div>
      )}

      <article
        aria-live="polite"
        className="editorial-copy mx-auto max-w-[880px] whitespace-pre-wrap py-9 text-[15px] leading-[1.8] text-[#332e27] sm:py-12 sm:text-[16px]"
      >
        {displaySentences.map((sentence, index) => {
          const isTimed = sentence.start !== undefined;
          const isActive = index === activeSentenceIndex;
          const content = showTranslation && selectedTranslations?.[index] ? (
            <ruby className="[ruby-align:start] [ruby-position:under]">
              {sentence.text}
              <rt
                lang={translationLanguage}
                className="font-sans text-[10px] font-normal leading-tight text-[#65705f] sm:text-[11px]"
              >
                {selectedTranslations[index]}
              </rt>
            </ruby>
          ) : (
            sentence.text
          );

          return isTimed ? (
            <span
              key={`${sentence.start}:${sentence.text.slice(0, 32)}`}
              role="button"
              tabIndex={0}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSeekTo(sentence.start ?? 0)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSeekTo(sentence.start ?? 0);
                }
              }}
              title="Afspil fra denne sætning"
              className={`cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/35 ${
                isActive
                  ? "bg-[#9f211e] text-[#f8f2e6] [box-decoration-break:clone]"
                  : "hover:bg-[#e7dfcf] [box-decoration-break:clone]"
              }`}
            >
              {content}
              {" "}
            </span>
          ) : (
            <span key={`${index}:${sentence.text.slice(0, 32)}`}>
              {content}{" "}
            </span>
          );
        })}
        {phase === "transcribing" && (
          <span
            className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-[#9f211e] align-middle"
            aria-hidden="true"
          />
        )}
      </article>
      {phase === "done" && (
        <p className="mx-auto max-w-[880px] border-t border-[#29231b]/20 pb-2 pt-3 text-[12px] leading-[1.8] text-[#70695f] sm:text-[13px]">
          AI kan tage fejl. Sammenlign med lydsporet, hvis noget virker forkert.
        </p>
      )}
    </section>
  );
}

function splitSentences(value: string): string[] {
  return (
    value
      .replace(/\s+/g, " ")
      .trim()
      .match(/[^.!?…]+(?:[.!?…]+|$)/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? []
  );
}

function getInitialTranslationLanguage(): TranslationLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(
      TRANSLATION_LANGUAGE_STORAGE_KEY,
    );
    return stored && isTranslationLanguage(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

function makeTranslationCacheKey(
  transcript: string,
  language: TranslationLanguage,
): string {
  let hash = 2166136261;
  for (let index = 0; index < transcript.length; index++) {
    hash ^= transcript.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${language}:${transcript.length}:${(hash >>> 0).toString(16)}`;
}

function readTranslationCache(
  key: string,
  expectedLength: number,
): string[] | undefined {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(TRANSLATION_CACHE_STORAGE_KEY) ?? "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const match = parsed.find(
      (entry): entry is TranslationCacheEntry =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as TranslationCacheEntry).key === key &&
        Array.isArray((entry as TranslationCacheEntry).translations) &&
        (entry as TranslationCacheEntry).translations.every(
          (value) => typeof value === "string",
        ) &&
        typeof (entry as TranslationCacheEntry).cachedAt === "number",
    );
    return match?.translations.length === expectedLength
      ? match.translations
      : undefined;
  } catch {
    return undefined;
  }
}

function writeTranslationCache(key: string, translations: string[]) {
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(TRANSLATION_CACHE_STORAGE_KEY) ?? "[]",
    ) as unknown;
    const current = Array.isArray(raw) ? raw : [];
    const next: TranslationCacheEntry[] = [
      { key, translations, cachedAt: Date.now() },
      ...current.filter(
        (entry): entry is TranslationCacheEntry =>
          typeof entry === "object" &&
          entry !== null &&
          (entry as TranslationCacheEntry).key !== key &&
          typeof (entry as TranslationCacheEntry).key === "string" &&
          Array.isArray((entry as TranslationCacheEntry).translations) &&
          typeof (entry as TranslationCacheEntry).cachedAt === "number",
      ),
    ].slice(0, 12);
    window.localStorage.setItem(
      TRANSLATION_CACHE_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // Translation still remains in memory when storage is unavailable.
  }
}
