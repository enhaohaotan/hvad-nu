"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TranscriptionPhase } from "@/lib/transcription-client";

const DUMMY_TRANSLATIONS = [
  "This is a sample translation of the Danish sentence above.",
  "Placeholder text is used here to preview the reading experience.",
  "The real translation will appear on this line later.",
] as const;

const TRANSLATION_LANGUAGES = {
  zh: { label: "中文", samples: DUMMY_TRANSLATIONS },
  en: { label: "English", samples: DUMMY_TRANSLATIONS },
  de: { label: "Deutsch", samples: DUMMY_TRANSLATIONS },
  fr: { label: "Français", samples: DUMMY_TRANSLATIONS },
  es: { label: "Español", samples: DUMMY_TRANSLATIONS },
  it: { label: "Italiano", samples: DUMMY_TRANSLATIONS },
  pt: { label: "Português", samples: DUMMY_TRANSLATIONS },
  nl: { label: "Nederlands", samples: DUMMY_TRANSLATIONS },
  sv: { label: "Svenska", samples: DUMMY_TRANSLATIONS },
  no: { label: "Norsk", samples: DUMMY_TRANSLATIONS },
  pl: { label: "Polski", samples: DUMMY_TRANSLATIONS },
  uk: { label: "Українська", samples: DUMMY_TRANSLATIONS },
  ru: { label: "Русский", samples: DUMMY_TRANSLATIONS },
  tr: { label: "Türkçe", samples: DUMMY_TRANSLATIONS },
  ja: { label: "日本語", samples: DUMMY_TRANSLATIONS },
  ko: { label: "한국어", samples: DUMMY_TRANSLATIONS },
  ar: { label: "العربية", samples: DUMMY_TRANSLATIONS },
  hi: { label: "हिन्दी", samples: DUMMY_TRANSLATIONS },
} as const;

type TranslationLanguage = keyof typeof TRANSLATION_LANGUAGES;
const TRANSLATION_LANGUAGE_STORAGE_KEY = "hvad-sagde-de:translation-language";

export function TranscriptView({
  episodeTitle,
  transcript,
  phase,
  isCopied,
  onCopy,
  onDownload,
}: {
  episodeTitle?: string;
  transcript: string;
  phase: TranscriptionPhase;
  isCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationLanguage, setTranslationLanguage] =
    useState<TranslationLanguage>(getInitialTranslationLanguage);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const sentences = useMemo(() => splitSentences(transcript), [transcript]);
  const selectedLanguage = TRANSLATION_LANGUAGES[translationLanguage];

  useEffect(() => {
    if (!isActionsMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActionsMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isActionsMenuOpen]);

  return (
    <section
      className="mt-12 border-t-4 border-[#76866f] pt-7 sm:mt-16 sm:pt-9"
      aria-labelledby="transcript-title"
    >
      <div className="border-b border-[#29231b]/40 pb-6 md:pr-[220px]">
        <div>
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
              onClick={() => setShowTranslation((visible) => !visible)}
              className="group flex h-full shrink-0 items-center gap-3 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#29231b] transition hover:bg-[#29231b] hover:text-[#f8f2e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
              aria-label={`${showTranslation ? "Skjul" : "Vis"} oversættelse`}
            >
              <span>Oversæt</span>
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
                      ([language, { label }]) => (
                        <button
                          key={language}
                          type="button"
                          role="menuitemradio"
                          aria-checked={translationLanguage === language}
                          onClick={() => {
                            const nextLanguage =
                              language as TranslationLanguage;
                            setTranslationLanguage(nextLanguage);
                            try {
                              window.localStorage.setItem(
                                TRANSLATION_LANGUAGE_STORAGE_KEY,
                                nextLanguage,
                              );
                            } catch {
                              // Keep the selection for this session.
                            }
                            setIsActionsMenuOpen(false);
                          }}
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
        </div>
      )}
      <article
        aria-live="polite"
        className="editorial-copy mx-auto max-w-[880px] whitespace-pre-wrap py-9 text-[15px] leading-[1.8] text-[#332e27] sm:py-12 sm:text-[16px]"
      >
        {showTranslation ? (
          <span>
            {sentences.map((sentence, index) => (
              <span key={`${index}:${sentence.slice(0, 32)}`}>
                <ruby className="[ruby-align:start] [ruby-position:under]">
                  {sentence}
                  <rt
                  lang={translationLanguage}
                    className="font-sans text-[10px] font-normal leading-tight text-[#65705f] sm:text-[11px]"
                  >
                    {
                      selectedLanguage.samples[
                        index % selectedLanguage.samples.length
                      ]
                    }
                  </rt>
                </ruby>{" "}
              </span>
            ))}
          </span>
        ) : (
          transcript
        )}
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

function isTranslationLanguage(value: string): value is TranslationLanguage {
  return value in TRANSLATION_LANGUAGES;
}

function getInitialTranslationLanguage(): TranslationLanguage {
  if (typeof window === "undefined") return "en";

  try {
    const storedLanguage = window.localStorage.getItem(
      TRANSLATION_LANGUAGE_STORAGE_KEY,
    );
    return storedLanguage && isTranslationLanguage(storedLanguage)
      ? storedLanguage
      : "en";
  } catch {
    return "en";
  }
}
