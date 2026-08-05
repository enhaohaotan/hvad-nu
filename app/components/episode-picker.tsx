"use client";

import { useState } from "react";
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

export function EpisodePicker({
  url,
  phase,
  isWorking,
  cachedEpisodes,
  latestSuggestion,
  latestGenstartEpisode,
  suggestionsReady,
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
  onUrlChange: (value: string) => void;
  onResolve: (value: string, selectedCache?: TranscriptCacheEntry) => void;
  onClear: () => void;
  onRemoveHistory: (entry: TranscriptCacheEntry) => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  function openSuggestions() {
    setShowSuggestions(suggestionsReady);
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
        <label htmlFor="episode-url" className="editorial-serif text-xl">
          Indsæt et link til en DR LYD-episode
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              id="episode-url"
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
              disabled={isWorking}
              className="min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 pr-16 text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#9f211e] focus:ring-2 focus:ring-[#9f211e]/15 disabled:opacity-60"
            />
            {url && (
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
            {showSuggestions && hasSuggestions && (
              <ul
                id="cached-episodes"
                role="listbox"
                aria-label="Gemte transskriptioner"
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto border border-[#29231b]/30 bg-[#f7f2e8] shadow-[0_14px_35px_rgba(43,35,27,0.2)] [scrollbar-color:#8b857a_#eee8dc] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[#f7f2e8] [&::-webkit-scrollbar-thumb]:bg-[#8b857a] [&::-webkit-scrollbar-thumb:hover]:bg-[#566550] [&::-webkit-scrollbar-track]:bg-[#eee8dc]"
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
              </ul>
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
