"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DrEpisode } from "@/lib/dr";
import { formatCachedTime, formatEpisodeMeta } from "@/lib/episode-format";
import {
  isRegeneratedTranscript,
  type TranscriptCacheEntry,
} from "@/lib/transcript-cache";
import type { TranscriptionPhase } from "@/lib/transcription-client";
import { StepLabel } from "./step-label";

const DR_DISCOVERY_LINKS = [
  { label: "DR LYD", href: "https://www.dr.dk/lyd" },
  {
    label: "Genstart",
    href: "https://www.dr.dk/lyd/special-radio/genstart-2642056922000",
  },
  {
    label: "Brinkmanns briks",
    href: "https://www.dr.dk/lyd/p1/brinkmanns-briks-2144855835000",
  },
  {
    label: "Klog på Sprog",
    href: "https://www.dr.dk/lyd/p1/klog-paa-sprog-1624041693000",
  },
] as const;

type SuggestionPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

export function EpisodePicker({
  url,
  phase,
  isWorking,
  cachedEpisodes,
  latestSuggestion,
  latestGenstartEpisode,
  suggestionsReady,
  readOnly = false,
  onUrlChange,
  onResolve,
  onClear,
  onRemoveHistory,
}: {
  url: string;
  phase: TranscriptionPhase;
  isWorking: boolean;
  cachedEpisodes: TranscriptCacheEntry[];
  latestSuggestion: { referenceUrl: string; episode: DrEpisode } | null;
  latestGenstartEpisode: DrEpisode | null;
  suggestionsReady: boolean;
  readOnly?: boolean;
  onUrlChange: (value: string) => void;
  onResolve: (value: string, selectedCache?: TranscriptCacheEntry) => void;
  onClear: () => void;
  onRemoveHistory: (entry: TranscriptCacheEntry) => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] =
    useState<SuggestionPosition | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const lastGeneratedSourceUrl =
    cachedEpisodes.find((entry) => entry.sourceUrl)?.sourceUrl ?? "";
  const cachedEpisodeLinks = cachedEpisodes.filter(
    (entry): entry is TranscriptCacheEntry & {
      sourceUrl: string;
      episodeTitle: string;
    } => Boolean(entry.sourceUrl && entry.episodeTitle),
  );
  const latestAvailableEpisode =
    latestSuggestion?.referenceUrl === lastGeneratedSourceUrl
      ? latestSuggestion.episode
      : null;
  const showFirstVisitSuggestion = cachedEpisodeLinks.length === 0;
  const latestSeriesEpisode = showFirstVisitSuggestion
    ? null
    : latestAvailableEpisode;
  const latestSeriesEpisodeIsCached = Boolean(
    latestSeriesEpisode &&
      cachedEpisodeLinks.some(
        (entry) => entry.audioUrl === latestSeriesEpisode.audioUrl,
      ),
  );
  const visibleCachedEpisodeLinks = showFirstVisitSuggestion
    ? []
    : cachedEpisodeLinks;
  const hasSuggestions =
    Boolean(
      (showFirstVisitSuggestion && latestGenstartEpisode) ||
        latestSeriesEpisode,
    ) || visibleCachedEpisodeLinks.length > 0;

  useEffect(() => {
    if (!showSuggestions) return;

    const updatePosition = () => {
      const container = inputContainerRef.current;
      if (container) setSuggestionPosition(positionSuggestions(container));
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showSuggestions]);

  function openSuggestions() {
    const container = inputContainerRef.current;
    if (!suggestionsReady || !container) return;
    setSuggestionPosition(positionSuggestions(container));
    setShowSuggestions(true);
  }

  function selectEpisode(value: string, selectedCache?: TranscriptCacheEntry) {
    setShowSuggestions(false);
    onUrlChange(value);
    onResolve(value, selectedCache);
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setShowSuggestions(false);
        onResolve(url);
      }}
      className="grid lg:grid-cols-[190px_1fr]"
    >
      <div className="border-b border-[#9f211e]/35 py-3 lg:border-b-0 lg:border-r lg:py-5 lg:pr-8">
        <StepLabel number="01" label="Vælg en udsendelse" />
      </div>
      <div className="py-4 sm:py-5 lg:pl-8">
        <p id="episode-url-label" className="editorial-serif text-xl">
          Indsæt et link til en DR LYD-episode
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div ref={inputContainerRef} className="relative flex-1">
            <input
              id="episode-url"
              aria-labelledby="episode-url-label"
              type="text"
              inputMode="url"
              autoComplete="off"
              value={url}
              onChange={(event) => {
                onUrlChange(event.target.value);
                openSuggestions();
              }}
              onFocus={openSuggestions}
              onClick={openSuggestions}
              onBlur={() => setShowSuggestions(false)}
              role="combobox"
              aria-autocomplete="list"
              aria-controls="cached-episodes"
              aria-expanded={showSuggestions && hasSuggestions}
              placeholder="https://www.dr.dk/lyd/…"
              readOnly={readOnly}
              disabled={isWorking}
              className={`min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#9f211e] focus:ring-2 focus:ring-[#9f211e]/15 disabled:opacity-60 ${readOnly ? "cursor-default" : "pr-16"}`}
            />
            {url && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  setShowSuggestions(false);
                  onClear();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b655b] underline decoration-[#6b655b]/45 underline-offset-4 transition hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
                aria-label="Ryd episodefeltet"
              >
                Ryd
              </button>
            )}
            {showSuggestions &&
              hasSuggestions &&
              suggestionPosition &&
              typeof document !== "undefined" &&
              createPortal(
                <ul
                  id="cached-episodes"
                  role="listbox"
                  aria-label="Gemte transskriptioner"
                  className="fixed z-50 overflow-y-auto border border-[#29231b]/30 bg-[#f7f2e8] shadow-[0_14px_35px_rgba(43,35,27,0.2)] [scrollbar-color:#8b857a_#eee8dc] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[#f7f2e8] [&::-webkit-scrollbar-thumb]:bg-[#8b857a] [&::-webkit-scrollbar-thumb:hover]:bg-[#566550] [&::-webkit-scrollbar-track]:bg-[#eee8dc]"
                  style={suggestionPosition}
                >
                {showFirstVisitSuggestion && latestGenstartEpisode && (
                  <li role="option" aria-selected={false}>
                    <SuggestionButton
                      label="Prøv den seneste episode fra Genstart"
                      episode={latestGenstartEpisode}
                      onSelect={() =>
                        selectEpisode(latestGenstartEpisode.sourceUrl)
                      }
                    />
                  </li>
                )}
                {latestSeriesEpisode && !latestSeriesEpisodeIsCached && (
                  <li
                    role="option"
                    aria-selected={false}
                    className="border-b border-[#29231b]/10"
                  >
                    <SuggestionButton
                      label={`Seneste fra ${latestSeriesEpisode.showTitle}`}
                      episode={latestSeriesEpisode}
                      onSelect={() =>
                        selectEpisode(latestSeriesEpisode.sourceUrl)
                      }
                    />
                  </li>
                )}
                {visibleCachedEpisodeLinks.map((entry) => {
                  const isLatestEpisode =
                    latestSeriesEpisode?.audioUrl === entry.audioUrl;
                  const episodeMeta = formatEpisodeMeta(
                    isLatestEpisode && latestSeriesEpisode
                      ? latestSeriesEpisode
                      : entry,
                  );
                  return (
                    <li
                      key={`${entry.model}:${entry.audioUrl}:${entry.cachedAt}`}
                      role="presentation"
                      className="relative border-b border-[#29231b]/10 last:border-b-0"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectEpisode(entry.sourceUrl, entry)}
                        className="w-full cursor-pointer px-4 py-3 text-left transition hover:bg-[#76866f]/10 focus:outline-none focus-visible:bg-[#76866f]/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9f211e]/25"
                      >
                        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          {entry.showTitle && (
                            <span
                              className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${isLatestEpisode ? "text-[#4f5f49]" : "text-[#9f211e]"}`}
                            >
                              {isLatestEpisode
                                ? `Seneste fra ${entry.showTitle}`
                                : entry.showTitle}
                            </span>
                          )}
                          <time
                            dateTime={new Date(
                              entry.firstGeneratedAt ?? entry.cachedAt,
                            ).toISOString()}
                            className="text-[9px] uppercase tracking-[0.08em] text-[#70695f]"
                          >
                            {isRegeneratedTranscript(cachedEpisodes, entry)
                              ? "Lavet igen"
                              : "Først lavet"}{" "}
                            {formatCachedTime(
                              entry.firstGeneratedAt ?? entry.cachedAt,
                            )}
                          </time>
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-sm font-semibold ${isLatestEpisode ? "text-[#302b25]" : "text-[#403a32]"}`}
                        >
                          {entry.episodeTitle}
                        </span>
                        {episodeMeta && (
                          <span className="mt-1 block pr-14 text-[9px] uppercase tracking-[0.08em] text-[#70695f]">
                            {episodeMeta}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onRemoveHistory(entry)}
                        aria-label={`Fjern ${entry.episodeTitle} fra historikken`}
                        className="absolute bottom-3 right-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9f211e] underline decoration-current/45 underline-offset-4 transition hover:text-[#6f1715] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
                      >
                        Fjern
                      </button>
                    </li>
                  );
                })}
                </ul>,
                document.body,
              )}
          </div>
          <button
            type="submit"
            disabled={!url.trim() || isWorking}
            className="min-h-13 border border-[#1d1915] bg-[#1d1915] px-7 text-xs font-semibold uppercase tracking-[0.14em] text-[#f8f2e6] transition enabled:hover:bg-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === "resolving" ? "Finder…" : "Find episode"}
          </button>
        </div>
        <nav
          aria-label="Find en episode i DR LYD"
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 text-[#70695f]"
        >
          <span>Find en episode:</span>
          {DR_DISCOVERY_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer font-semibold text-[#4f5f49] underline decoration-current/40 underline-offset-4 transition hover:text-[#9f211e]"
            >
              {link.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
      </div>
    </form>
  );
}

function positionSuggestions(container: HTMLDivElement): SuggestionPosition {
  const rect = container.getBoundingClientRect();
  const margin = 12;
  const gap = 6;
  const availableBelow = window.innerHeight - rect.bottom - gap - margin;
  const availableAbove = rect.top - gap - margin;
  const placeBelow = availableBelow >= 180 || availableBelow >= availableAbove;
  const availableHeight = placeBelow ? availableBelow : availableAbove;
  const maxHeight = Math.max(80, Math.min(288, availableHeight));
  const width = Math.min(rect.width, window.innerWidth - margin * 2);
  const left = Math.min(
    Math.max(margin, rect.left),
    window.innerWidth - width - margin,
  );

  return {
    left,
    top: placeBelow
      ? rect.bottom + gap
      : Math.max(margin, rect.top - gap - maxHeight),
    width,
    maxHeight,
  };
}

function SuggestionButton({
  label,
  episode,
  onSelect,
}: {
  label: string;
  episode: DrEpisode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className="w-full cursor-pointer px-4 py-3 text-left transition hover:bg-[#76866f]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9f211e]/25"
    >
      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4f5f49]">
          {label}
        </span>
        <span className="text-[9px] uppercase tracking-[0.08em] text-[#70695f]">
          Ikke lavet endnu
        </span>
      </span>
      <span className="mt-0.5 block truncate text-sm font-semibold text-[#302b25]">
        {episode.episodeTitle}
      </span>
      <span className="mt-1 block text-[9px] uppercase tracking-[0.08em] text-[#70695f]">
        {formatEpisodeMeta(episode)}
      </span>
    </button>
  );
}
