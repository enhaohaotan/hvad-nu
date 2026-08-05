"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { DrEpisode } from "@/lib/dr";
import {
  addCachedTranscript,
  findCachedTranscript,
  isRegeneratedTranscript,
  parseTranscriptCache,
  type TranscriptCacheEntry,
} from "@/lib/transcript-cache";

const API_KEY_STORAGE = "danish-listening-companion.openai-api-key";
const TRANSCRIPT_CACHE_STORAGE = "danish-listening-companion.transcripts.v1";
const TRANSCRIPTION_MODEL = "gpt-transcribe";
const GENSTART_REFERENCE_URL =
  "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/sort-mand-paa-plakaten-11802650176";
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

type Phase =
  | "idle"
  | "resolving"
  | "ready"
  | "downloading"
  | "preparing"
  | "transcribing"
  | "done"
  | "error";

export function ListeningCompanion() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyInputVisible, setIsApiKeyInputVisible] = useState(false);
  const [episode, setEpisode] = useState<DrEpisode | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [errorDebug, setErrorDebug] = useState("");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [cachedEpisodes, setCachedEpisodes] = useState<TranscriptCacheEntry[]>([]);
  const [showCachedEpisodes, setShowCachedEpisodes] = useState(false);
  const [latestSuggestion, setLatestSuggestion] = useState<{
    referenceUrl: string;
    episode: DrEpisode;
  } | null>(null);
  const [latestGenstartEpisode, setLatestGenstartEpisode] =
    useState<DrEpisode | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isContactCopied, setIsContactCopied] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playerError, setPlayerError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const copyFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let storedKey = "";
    let storedTranscripts: TranscriptCacheEntry[] = [];
    try {
      storedKey = localStorage.getItem(API_KEY_STORAGE) ?? "";
      storedTranscripts = parseTranscriptCache(
        localStorage.getItem(TRANSCRIPT_CACHE_STORAGE),
      );
    } catch {
      // Browser storage can be unavailable in hardened privacy modes.
    }
    const frame = requestAnimationFrame(() => {
      setApiKey(storedKey);
      setIsApiKeyInputVisible(!storedKey);
      setCachedEpisodes(storedTranscripts);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (copyFeedbackRef.current) clearTimeout(copyFeedbackRef.current);
    };
  }, []);

  const lastGeneratedSourceUrl =
    cachedEpisodes.find((entry) => entry.sourceUrl)?.sourceUrl ?? "";

  useEffect(() => {
    const controller = new AbortController();
    async function loadLatestGenstartEpisode() {
      try {
        const response = await fetch(
          `/api/latest?url=${encodeURIComponent(GENSTART_REFERENCE_URL)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const body = (await response.json()) as { episode?: DrEpisode };
        if (response.ok && body.episode) {
          setLatestGenstartEpisode(body.episode);
        }
      } catch {
        // The input remains usable if DR's feed is temporarily unavailable.
      }
    }

    void loadLatestGenstartEpisode();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!lastGeneratedSourceUrl) return;

    const controller = new AbortController();
    async function loadLatestEpisode() {
      try {
        const response = await fetch(
          `/api/latest?url=${encodeURIComponent(lastGeneratedSourceUrl)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const body = (await response.json()) as {
          episode?: DrEpisode;
        };
        if (response.ok && body.episode) {
          setLatestSuggestion({
            referenceUrl: lastGeneratedSourceUrl,
            episode: body.episode,
          });
        }
      } catch {
        // The saved transcript list still works if DR's feed is unavailable.
      }
    }

    void loadLatestEpisode();
    return () => controller.abort();
  }, [lastGeneratedSourceUrl]);

  useEffect(() => {
    const sourceUrls = [...new Set(
      cachedEpisodes
        .filter((entry) => entry.sourceUrl && (!entry.publishedAt || !entry.duration))
        .map((entry) => entry.sourceUrl as string),
    )];
    if (sourceUrls.length === 0) return;

    const controller = new AbortController();
    async function enrichCachedEpisodes() {
      const resolved = await Promise.all(
        sourceUrls.map(async (sourceUrl) => {
          try {
            const response = await fetch(
              `/api/resolve?url=${encodeURIComponent(sourceUrl)}`,
              { signal: controller.signal, cache: "no-store" },
            );
            const body = (await response.json()) as { episode?: DrEpisode };
            return response.ok && body.episode ? body.episode : null;
          } catch {
            return null;
          }
        }),
      );
      if (controller.signal.aborted) return;

      const episodes = resolved.filter((item): item is DrEpisode => Boolean(item));
      if (episodes.length === 0) return;
      setCachedEpisodes((current) => {
        const updated = current.map((entry) => {
          const resolvedEpisode = episodes.find(
            (item) =>
              item.audioUrl === entry.audioUrl ||
              item.sourceUrl === entry.sourceUrl,
          );
          if (!resolvedEpisode) return entry;
          const publishedAt =
            resolvedEpisode.publishedAt || entry.publishedAt;
          const duration = resolvedEpisode.duration || entry.duration;
          if (
            publishedAt === entry.publishedAt &&
            duration === entry.duration
          ) {
            return entry;
          }
          return { ...entry, publishedAt, duration };
        });
        if (updated.every((entry, index) => entry === current[index])) {
          return current;
        }
        try {
          localStorage.setItem(
            TRANSCRIPT_CACHE_STORAGE,
            JSON.stringify(updated),
          );
        } catch {
          // The enriched metadata can remain in memory when storage is unavailable.
        }
        return updated;
      });
    }

    void enrichCachedEpisodes();
    return () => controller.abort();
  }, [cachedEpisodes]);

  const isWorking = [
    "resolving",
    "downloading",
    "preparing",
    "transcribing",
  ].includes(phase);
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
  const hasEpisodeSuggestions =
    Boolean(
      (showFirstVisitSuggestion && latestGenstartEpisode) ||
      latestSeriesEpisode,
    ) || visibleCachedEpisodeLinks.length > 0;

  async function handleResolve(event: FormEvent) {
    event.preventDefault();
    await resolveEpisode(url);
  }

  async function resolveEpisode(
    value: string,
    selectedCache?: TranscriptCacheEntry,
  ) {
    if (!value.trim()) return;
    setShowCachedEpisodes(false);
    setIsCopied(false);
    resetPlayer();

    try {
      new URL(value.trim());
    } catch {
      setEpisode(null);
      setTranscript("");
      setPhase("error");
      setMessage("Indsæt en gyldig URL til en DR LYD-episode.");
      setErrorDebug("");
      setProgress(0);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setEpisode(null);
    setTranscript("");
    setMessage("");
    setErrorDebug("");
    setPhase("resolving");
    setProgress(0);

    try {
      const response = await fetch(`/api/resolve?url=${encodeURIComponent(value)}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const body = (await response.json()) as {
        episode?: DrEpisode;
        error?: string;
      };
      if (!response.ok || !body.episode) {
        throw new Error(body.error || "Episoden kunne ikke findes.");
      }
      setEpisode(body.episode);
      const cachedTranscript =
        selectedCache?.audioUrl === body.episode.audioUrl
          ? selectedCache.transcript
          : readCachedTranscript(body.episode.audioUrl);
      if (cachedTranscript) {
        setTranscript(cachedTranscript);
        setPhase("done");
        setMessage("Episoden er transskriberet før — den gemte tekst vises igen");
        setProgress(100);
      } else {
        setPhase("ready");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase("error");
      setMessage(errorMessage(error));
      setErrorDebug("");
    }
  }

  function handleApiKey(value: string) {
    setApiKey(value);
    try {
      if (value) localStorage.setItem(API_KEY_STORAGE, value);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      // The input still works for this session when storage is unavailable.
    }
  }

  function forgetApiKey() {
    handleApiKey("");
    setIsApiKeyInputVisible(true);
  }

  async function handleTranscribe() {
    if (!episode || !apiKey.trim() || isWorking) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setTranscript("");
    setMessage("Downloader episoden fra DR LYD…");
    setErrorDebug("");
    setProgress(0);
    setPhase("downloading");
    setIsCopied(false);

    try {
      const finalText = await transcribeEpisode({
        url: episode.sourceUrl,
        apiKey: apiKey.trim(),
        signal: controller.signal,
        onProgress(event) {
          setPhase(event.phase);
          setMessage(event.message);
          setProgress(event.progress);
        },
        onTranscript(value) {
          setTranscript(value);
        },
      });
      setTranscript(finalText);
      const updatedCache = cacheTranscript(episode, finalText, true);
      if (updatedCache) setCachedEpisodes(updatedCache);

      setPhase("done");
      setMessage("Transskriptionen er klar");
      setProgress(100);
    } catch (error) {
      if (controller.signal.aborted) {
        setPhase(episode ? "ready" : "idle");
        setMessage("");
        setProgress(0);
        return;
      }
      setPhase("error");
      setMessage(errorMessage(error));
      setErrorDebug(errorDebugMessage(error));
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function clearEpisode() {
    resetPlayer();
    abortRef.current?.abort();
    abortRef.current = null;
    setUrl("");
    setEpisode(null);
    setTranscript("");
    setPhase("idle");
    setMessage("");
    setErrorDebug("");
    setProgress(0);
    setShowCachedEpisodes(false);
    setIsCopied(false);
  }

  function removeHistoryEntry(target: TranscriptCacheEntry) {
    setCachedEpisodes((current) => {
      const updated = current.filter(
        (entry) =>
          entry.audioUrl !== target.audioUrl ||
          entry.model !== target.model ||
          entry.cachedAt !== target.cachedAt,
      );
      try {
        if (updated.length > 0) {
          localStorage.setItem(
            TRANSCRIPT_CACHE_STORAGE,
            JSON.stringify(updated),
          );
        } else {
          localStorage.removeItem(TRANSCRIPT_CACHE_STORAGE);
        }
      } catch {
        // The in-memory entry can still be removed when storage is unavailable.
      }
      return updated;
    });
  }

  async function openPlayer() {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlayerOpen(true);
    setPlayerError("");
    try {
      await audio.play();
    } catch {
      setPlayerError("Lyden kunne ikke afspilles.");
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    setPlayerError("");
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlayerError("Lyden kunne ikke afspilles.");
      }
    } else {
      audio.pause();
    }
  }

  async function toggleEpisodePlayback() {
    if (isPlayerOpen) {
      await togglePlayback();
    } else {
      await openPlayer();
    }
  }

  function seekBy(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), limit);
  }

  function closePlayer() {
    audioRef.current?.pause();
    setIsPlayerOpen(false);
    setIsPlaying(false);
    setPlayerError("");
  }

  function resetPlayer() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = 1;
    }
    setIsPlayerOpen(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
    setPlaybackRate(1);
    setPlayerError("");
  }

  async function copyTranscript() {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setIsCopied(true);
    if (copyFeedbackRef.current) clearTimeout(copyFeedbackRef.current);
    copyFeedbackRef.current = setTimeout(() => setIsCopied(false), 2000);
  }

  async function copyContactEmail() {
    await navigator.clipboard.writeText("enhaohao.tan@gmail.com");
    setIsContactCopied(true);
    setTimeout(() => setIsContactCopied(false), 2000);
  }

  function downloadTranscript() {
    if (!transcript) return;

    const title = episode?.episodeTitle || "transskription";
    const safeTitle = title
      .toLocaleLowerCase("da")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-|-$/g, "") || "transskription";
    const filename = `${safeTitle}.txt`;
    const href = URL.createObjectURL(
      new Blob([transcript], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="min-h-screen bg-[#9f211e] p-2.5 text-[#1d1915] sm:p-5 lg:p-7">
      <div className="editorial-sheet min-h-[calc(100vh-20px)] w-full bg-[#f3eddf] px-5 pb-8 pt-6 shadow-[0_24px_80px_rgba(43,8,6,0.28)] sm:min-h-[calc(100vh-40px)] sm:px-10 sm:pb-10 lg:min-h-[calc(100vh-56px)] lg:px-16 lg:pt-9">
        <header className="flex items-center justify-between gap-4 border-b border-[#262018]/70 pb-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] sm:pb-3 sm:text-xs sm:tracking-[0.18em]">
          <span>Hva’ sagde de?</span>
          <span className="text-right text-[#66745e]">
            For dem, der stadig siger “hva’?”
          </span>
        </header>

        <section id="top" className="pt-6 sm:pt-14 lg:pt-16">
          <div className="w-full">
            <h1 className="editorial-serif text-[clamp(3rem,13vw,4.75rem)] uppercase leading-[0.86] tracking-[-0.06em] sm:text-[clamp(5rem,8vw,8.5rem)] sm:leading-[0.82] sm:tracking-[-0.065em]">
              Hva’ sagde de?
            </h1>
            <p className="editorial-serif mt-5 w-full text-[13px] leading-5 text-[#4b463f] sm:mt-7 sm:text-base sm:leading-7">
              Gør enhver DR LYD-podcastepisode til en tydelig dansk transskription — klar til at læse med, mens du lytter.
            </p>
          </div>

          <section className="mt-6 border-y-2 border-[#9f211e] sm:mt-10" aria-label="Lav en transskription">
            <form noValidate onSubmit={handleResolve} className="grid lg:grid-cols-[190px_1fr]">
              <div className="border-b border-[#9f211e]/35 py-3 lg:border-b-0 lg:border-r lg:py-5 lg:pr-8">
                <StepLabel number="01" label="Vælg en udsendelse" />
              </div>
              <div className="py-4 sm:py-5 lg:pl-8">
                <label htmlFor="episode-url" className="editorial-serif text-xl">Indsæt et link til en DR LYD-episode</label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <input
                      id="episode-url"
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      value={url}
                      onChange={(event) => {
                        setUrl(event.target.value);
                        setShowCachedEpisodes(true);
                      }}
                      onFocus={() => setShowCachedEpisodes(true)}
                      onBlur={() => setShowCachedEpisodes(false)}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="cached-episodes"
                      aria-expanded={showCachedEpisodes && hasEpisodeSuggestions}
                      placeholder="https://www.dr.dk/lyd/…"
                      disabled={isWorking}
                      className="min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 pr-16 text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#9f211e] focus:ring-2 focus:ring-[#9f211e]/15 disabled:opacity-60"
                    />
                    {url && (
                      <button
                        type="button"
                        onClick={clearEpisode}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b655b] underline decoration-[#6b655b]/45 underline-offset-4 transition hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
                        aria-label="Ryd episodefeltet"
                      >
                        Ryd
                      </button>
                    )}
                    {showCachedEpisodes && hasEpisodeSuggestions && (
                      <ul
                        id="cached-episodes"
                        role="listbox"
                        aria-label="Gemte transskriptioner"
                        className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto border border-[#29231b]/30 bg-[#f7f2e8] shadow-[0_14px_35px_rgba(43,35,27,0.2)] [scrollbar-color:#8b857a_#eee8dc] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[#f7f2e8] [&::-webkit-scrollbar-thumb]:bg-[#8b857a] [&::-webkit-scrollbar-thumb:hover]:bg-[#566550] [&::-webkit-scrollbar-track]:bg-[#eee8dc]"
                      >
                        {showFirstVisitSuggestion && latestGenstartEpisode && (
                          <li role="option" aria-selected={false}>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setShowCachedEpisodes(false);
                                setUrl(latestGenstartEpisode.sourceUrl);
                                void resolveEpisode(latestGenstartEpisode.sourceUrl);
                              }}
                              className="w-full cursor-pointer px-4 py-3 text-left transition hover:bg-[#76866f]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9f211e]/25"
                            >
                              <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4f5f49]">
                                  Prøv den seneste episode fra Genstart
                                </span>
                                <span className="text-[9px] uppercase tracking-[0.08em] text-[#70695f]">
                                  Ikke lavet endnu
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-sm font-semibold text-[#302b25]">
                                {latestGenstartEpisode.episodeTitle}
                              </span>
                              <span className="mt-1 block text-[9px] uppercase tracking-[0.08em] text-[#70695f]">
                                {formatEpisodeMeta(latestGenstartEpisode)}
                              </span>
                            </button>
                          </li>
                        )}
                        {latestSeriesEpisode && !latestSeriesEpisodeIsCached && (
                          <li role="option" aria-selected={false} className="border-b border-[#29231b]/10">
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setShowCachedEpisodes(false);
                                setUrl(latestSeriesEpisode.sourceUrl);
                                void resolveEpisode(latestSeriesEpisode.sourceUrl);
                              }}
                              className="w-full cursor-pointer px-4 py-3 text-left transition hover:bg-[#76866f]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9f211e]/25"
                            >
                              <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4f5f49]">
                                  Seneste fra {latestSeriesEpisode.showTitle}
                                </span>
                                <span className="text-[9px] uppercase tracking-[0.08em] text-[#70695f]">
                                  Ikke lavet endnu
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-sm font-semibold text-[#302b25]">
                                {latestSeriesEpisode.episodeTitle}
                              </span>
                              <span className="mt-1 block text-[9px] uppercase tracking-[0.08em] text-[#70695f]">
                                {formatEpisodeMeta(latestSeriesEpisode)}
                              </span>
                            </button>
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
                            <li key={`${entry.model}:${entry.audioUrl}:${entry.cachedAt}`} role="presentation" className="relative border-b border-[#29231b]/10 last:border-b-0">
                              <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setShowCachedEpisodes(false);
                                  setUrl(entry.sourceUrl);
                                  void resolveEpisode(entry.sourceUrl, entry);
                                }}
                                className="w-full cursor-pointer px-4 py-3 text-left transition hover:bg-[#76866f]/10 focus:outline-none focus-visible:bg-[#76866f]/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9f211e]/25"
                              >
                                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                  {entry.showTitle && (
                                    <span className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${isLatestEpisode ? "text-[#4f5f49]" : "text-[#9f211e]"}`}>
                                      {isLatestEpisode
                                        ? `Seneste fra ${entry.showTitle}`
                                        : entry.showTitle}
                                    </span>
                                  )}
                                  <time
                                    dateTime={new Date(entry.firstGeneratedAt ?? entry.cachedAt).toISOString()}
                                    className="text-[9px] uppercase tracking-[0.08em] text-[#70695f]"
                                  >
                                    {isRegeneratedTranscript(cachedEpisodes, entry)
                                      ? "Lavet igen"
                                      : "Først lavet"}{" "}
                                    {formatCachedTime(entry.firstGeneratedAt ?? entry.cachedAt)}
                                  </time>
                                </span>
                                <span className={`mt-0.5 block truncate text-sm font-semibold ${isLatestEpisode ? "text-[#302b25]" : "text-[#403a32]"}`}>
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
                                onClick={() => removeHistoryEntry(entry)}
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

            {episode && (
              <div className="border-t border-[#9f211e]/45">
                <div className="grid lg:grid-cols-[190px_1fr]">
                  <div className="border-b border-[#9f211e]/35 py-5 lg:border-b-0 lg:border-r lg:pr-8">
                    <StepLabel number="02" label="Gennemse og transskriber" />
                  </div>
                  <div className="py-6 lg:pl-8">
                    <EpisodePreview
                      episode={episode}
                      isPlaying={isPlaying}
                      onPlay={() => void toggleEpisodePlayback()}
                    />

                    <div className="mt-7 border-t border-[#29231b]/20 pt-6">
                      <div className="flex items-end justify-between gap-4">
                        <p className="editorial-serif text-xl">OpenAI API-nøgle</p>
                        {apiKey && (
                          <button type="button" onClick={forgetApiKey} disabled={isWorking} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b655b] underline underline-offset-4 enabled:hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25 disabled:opacity-40">
                            Fjern nøgle
                          </button>
                        )}
                      </div>
                      {isApiKeyInputVisible ? (
                        <>
                          <label htmlFor="api-key" className="sr-only">OpenAI API-nøgle</label>
                          <input
                            id="api-key"
                            type="password"
                            value={apiKey}
                            onChange={(event) => handleApiKey(event.target.value)}
                            placeholder="sk-…"
                            autoComplete="off"
                            spellCheck={false}
                            disabled={isWorking}
                            className="mt-3 min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 font-mono text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#9f211e] focus:ring-2 focus:ring-[#9f211e]/15 disabled:opacity-60"
                          />
                        </>
                      ) : (
                        <p className="mt-3 border border-[#76866f]/40 bg-[#76866f]/5 px-4 py-3 text-xs font-semibold text-[#4f5f49]">
                          API-nøglen er gemt i denne browser
                        </p>
                      )}
                      <p className="mt-2 text-xs leading-5 text-[#6b655b]">
                        API-nøglen gemmes i denne browser. Den sendes kun ved transskription og gemmes aldrig på vores server.
                      </p>
                      <details className="mt-3 border-t border-[#29231b]/15 pt-2">
                        <summary className="inline-block cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.13em] text-[#575147] underline decoration-current/40 underline-offset-4 transition hover:text-[#9f211e] [&::-webkit-details-marker]:hidden">
                          Se estimeret OpenAI-pris
                        </summary>
                        <div className="mt-2 overflow-hidden border border-[#29231b]/20">
                          <p className="px-4 py-2 text-[10px] text-[#70695f]">
                            Model: gpt-transcribe · 0,0045 USD/min.
                          </p>
                          <table className="w-full table-fixed text-left text-xs text-[#575147]">
                            <caption className="sr-only">Estimeret pris efter episodens varighed</caption>
                            <thead className="bg-[#76866f]/5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#70695f]">
                              <tr>
                                <th className="px-4 py-2" scope="col">Varighed</th>
                                <th className="px-4 py-2" scope="col">Pris</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#29231b]/10">
                              <tr><td className="px-4 py-2">20 min.</td><td className="px-4 py-2">ca. 0,59 kr.</td></tr>
                              <tr><td className="px-4 py-2">40 min.</td><td className="px-4 py-2">ca. 1,18 kr.</td></tr>
                              <tr><td className="px-4 py-2">60 min.</td><td className="px-4 py-2">ca. 1,77 kr.</td></tr>
                            </tbody>
                          </table>
                          <p className="border-t border-[#29231b]/15 px-4 py-2 text-[10px] leading-4 text-[#70695f]">
                            Omregnet med 1 USD ≈ 6,57 kr. Betales direkte til OpenAI. Priser og valutakurs kan ændre sig.
                          </p>
                        </div>
                      </details>
                    </div>

                    <button
                      type="button"
                      onClick={handleTranscribe}
                      disabled={!apiKey.trim() || isWorking}
                      className="mt-6 flex min-h-[56px] w-full items-center justify-between bg-[#9f211e] px-6 text-xs font-semibold uppercase tracking-[0.15em] text-[#f8f2e6] transition enabled:hover:bg-[#851b18] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>{phase === "done" ? "Lav ny transskription" : "Lav transskription"}</span>
                      <span className="text-lg" aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase !== "resolving" && (isWorking || message) && (
              <StatusPanel phase={phase} message={message} errorDebug={errorDebug} episodeUrl={episode?.sourceUrl ?? url} progress={progress} isWorking={isWorking} onCancel={cancel} />
            )}
          </section>

          {transcript && (
            <section className="mt-12 border-t-4 border-[#76866f] pt-7 sm:mt-16 sm:pt-9" aria-labelledby="transcript-title">
              <div className="grid gap-6 border-b border-[#29231b]/40 pb-6 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9f211e]">Transskriptionen</p>
                  <h2 id="transcript-title" className="editorial-serif mt-2 max-w-[900px] text-3xl leading-none tracking-[-0.035em] sm:text-5xl">{episode?.episodeTitle}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={copyTranscript} aria-live="polite" className="w-fit border border-[#29231b] bg-[#29231b] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f8f2e6] transition hover:border-[#9f211e] hover:bg-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20">
                    {isCopied ? "Kopieret" : "Kopiér tekst"}
                  </button>
                  <button type="button" onClick={downloadTranscript} className="w-fit border border-[#29231b] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:bg-[#29231b] hover:text-[#f8f2e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20">
                    Hent tekst
                  </button>
                </div>
              </div>
              <article aria-live="polite" className="editorial-copy mx-auto max-w-[880px] whitespace-pre-wrap py-9 text-[15px] leading-[1.8] text-[#332e27] sm:py-12 sm:text-[16px]">
                {transcript}
                {phase === "transcribing" && <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-[#9f211e] align-middle" aria-hidden="true" />}
              </article>
              {phase === "done" && (
                <p className="mx-auto max-w-[880px] border-t border-[#29231b]/20 pb-2 pt-3 text-[10px] leading-5 text-[#70695f]">
                  AI kan tage fejl. Sammenlign med lydsporet, hvis noget virker forkert.
                </p>
              )}
            </section>
          )}
        </section>

        <footer className="mt-14 flex items-center justify-between gap-4 border-t border-[#262018]/70 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#575147]">
          <address className="not-italic">
            <button
              type="button"
              onClick={() => void copyContactEmail()}
              className="cursor-pointer uppercase underline decoration-current/35 underline-offset-4 transition hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
            >
              {isContactCopied ? "E-MAIL KOPIERET" : "KONTAKT"}
            </button>
          </address>
          <span>© 2026 Enhao Tan</span>
        </footer>
        {isPlayerOpen && <div className="h-36 sm:h-28" aria-hidden="true" />}
      </div>

      {episode && (
        <audio
          key={episode.audioUrl}
          ref={audioRef}
          preload="metadata"
          src={episode.audioUrl}
          onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)}
          onDurationChange={(event) => setAudioDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onRateChange={(event) => setPlaybackRate(event.currentTarget.playbackRate)}
          onCanPlay={() => setPlayerError("")}
          onError={() => setPlayerError("Lyden kunne ikke afspilles.")}
        />
      )}

      {episode && isPlayerOpen && (
        <aside
          aria-label="Lydafspiller"
          className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-[#9f211e] bg-[#1d1915] text-[#f3eddf] shadow-[0_-16px_45px_rgba(29,25,21,0.28)]"
        >
          <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d7a6a2]">{episode.showTitle}</p>
                <p className="truncate text-sm font-semibold">{episode.episodeTitle}</p>
              </div>
              <button
                type="button"
                onClick={closePlayer}
                className="shrink-0 cursor-pointer text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d8d0c4] underline decoration-current/40 underline-offset-4 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Luk
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? "Pause" : "Afspil"}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center bg-[#9f211e] text-sm transition hover:bg-[#bd2925] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
              </button>
              <button
                type="button"
                onClick={() => seekBy(-5)}
                aria-label="Fem sekunder tilbage"
                className="h-10 shrink-0 cursor-pointer border border-[#f3eddf]/35 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] transition hover:border-[#f3eddf] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                −5 s
              </button>
              <button
                type="button"
                onClick={() => seekBy(5)}
                aria-label="Fem sekunder frem"
                className="h-10 shrink-0 cursor-pointer border border-[#f3eddf]/35 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] transition hover:border-[#f3eddf] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                +5 s
              </button>
              <span className="min-w-[88px] font-mono text-[10px] text-[#d8d0c4]">
                {formatPlaybackTime(currentTime)} / {formatPlaybackTime(audioDuration)}
              </span>
              <input
                type="range"
                min="0"
                max={audioDuration || 0}
                step="0.1"
                value={Math.min(currentTime, audioDuration || 0)}
                onChange={(event) => {
                  const nextTime = Number(event.target.value);
                  if (audioRef.current) audioRef.current.currentTime = nextTime;
                  setCurrentTime(nextTime);
                }}
                disabled={!audioDuration}
                aria-label="Spol i episoden"
                className="h-1 min-w-[140px] flex-1 accent-[#9f211e] disabled:opacity-40"
              />
              <label htmlFor="playback-rate" className="sr-only">Afspilningshastighed</label>
              <select
                id="playback-rate"
                value={playbackRate}
                onChange={(event) => {
                  const nextRate = Number(event.target.value);
                  if (audioRef.current) audioRef.current.playbackRate = nextRate;
                  setPlaybackRate(nextRate);
                }}
                className="h-10 cursor-pointer border border-[#f3eddf]/35 bg-[#1d1915] px-2 text-[10px] font-semibold text-[#f3eddf] outline-none"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <option key={rate} value={rate}>{rate.toLocaleString("da-DK")}×</option>
                ))}
              </select>
            </div>
            {playerError && (
              <p className="mt-2 text-[10px] text-[#f0aaa5]" role="alert">{playerError}</p>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}

function StepLabel({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <span className="font-mono text-xs font-semibold text-[#9f211e]">{number}</span>
      <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-[0.15em] text-[#575147]">{label}</p>
    </div>
  );
}

function readCachedTranscript(audioUrl: string): string {
  try {
    const entries = parseTranscriptCache(
      localStorage.getItem(TRANSCRIPT_CACHE_STORAGE),
    );
    return findCachedTranscript(entries, audioUrl, TRANSCRIPTION_MODEL)?.transcript ?? "";
  } catch {
    return "";
  }
}

function formatCachedTime(value: number): string {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPlaybackTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function cacheTranscript(
  episode: DrEpisode,
  transcript: string,
  createNewVersion = false,
): TranscriptCacheEntry[] | null {
  try {
    const entries = parseTranscriptCache(
      localStorage.getItem(TRANSCRIPT_CACHE_STORAGE),
    );
    const previousVersion = findCachedTranscript(
      entries,
      episode.audioUrl,
      TRANSCRIPTION_MODEL,
    );
    const updated = addCachedTranscript(
      entries,
      {
        audioUrl: episode.audioUrl,
        model: TRANSCRIPTION_MODEL,
        transcript,
        cachedAt: Date.now(),
        firstGeneratedAt: createNewVersion ? Date.now() : undefined,
        isRegenerated: createNewVersion && Boolean(previousVersion),
        sourceUrl: episode.sourceUrl,
        episodeTitle: episode.episodeTitle,
        showTitle: episode.showTitle,
        publishedAt: episode.publishedAt,
        duration: episode.duration,
      },
      createNewVersion,
    );
    localStorage.setItem(TRANSCRIPT_CACHE_STORAGE, JSON.stringify(updated));
    return updated;
  } catch {
    // A full or unavailable browser store must not interrupt transcription.
    return null;
  }
}

function EpisodePreview({
  episode,
  isPlaying,
  onPlay,
}: {
  episode: DrEpisode;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-[112px_1fr] sm:items-center">
      {episode.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={episode.imageUrl} alt="" className="h-28 w-28 border border-[#29231b]/30 object-cover grayscale-[18%]" />
      ) : (
        <div className="flex h-28 w-28 items-center justify-center border border-[#29231b]/30 bg-[#e4dccb] text-2xl" aria-hidden="true">♪</div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9f211e]">{episode.showTitle}</p>
        <h2 className="editorial-serif mt-2 line-clamp-3 pb-1 text-2xl leading-[1.15] tracking-[-0.03em] sm:text-3xl">{episode.episodeTitle}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b655b]">{formatEpisodeMeta(episode)}</p>
          <button
            type="button"
            onClick={onPlay}
            className="cursor-pointer border border-[#29231b]/45 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#403a32] transition hover:border-[#9f211e] hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/20"
          >
            <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>{" "}
            {isPlaying ? "Pause" : "Afspil"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({ phase, message, errorDebug, episodeUrl, progress, isWorking, onCancel }: { phase: Phase; message: string; errorDebug: string; episodeUrl: string; progress: number; isWorking: boolean; onCancel: () => void }) {
  const isError = phase === "error";
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [isDebugCopied, setIsDebugCopied] = useState(false);
  const [isErrorContactCopied, setIsErrorContactCopied] = useState(false);
  const errorDetail =
    isError && message === "Episoden findes ikke i DR LYDs offentlige RSS-feed."
      ? "Det kan skyldes DR LYDs udgivelsespolitik: De nyeste episoder er ikke altid tilgængelige i det offentlige RSS-feed med det samme. Prøv en episode fra en tidligere dag."
      : "";
  const debugReport = errorDebug
    ? buildDebugReport({ message, errorDebug, episodeUrl })
    : "";

  async function copyErrorDebug() {
    await navigator.clipboard.writeText(debugReport);
    setIsDebugCopied(true);
    setTimeout(() => setIsDebugCopied(false), 2000);
  }

  async function copyErrorContactEmail() {
    await navigator.clipboard.writeText("enhaohao.tan@gmail.com");
    setIsErrorContactCopied(true);
    setTimeout(() => setIsErrorContactCopied(false), 2000);
  }

  return (
    <div className={`border-t border-[#9f211e]/45 px-4 py-5 sm:px-6 ${isError ? "bg-[#9f211e]/5" : ""}`} role={isError ? "alert" : "status"}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${isError ? "text-[#9f211e]" : "text-[#575147]"}`}>{message}</p>
            {errorDetail && (
              <button
                type="button"
                onClick={() => setShowErrorDetail((visible) => !visible)}
                aria-expanded={showErrorDetail}
                className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.1em] text-[#625b52] underline decoration-current/40 underline-offset-4 transition hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
              >
                Hvorfor?
              </button>
            )}
          </div>
          {errorDetail && showErrorDetail && (
            <p className="mt-2 max-w-[720px] text-xs font-normal normal-case leading-5 tracking-normal text-[#625b52] sm:text-[13px] sm:leading-6">
              {errorDetail}
            </p>
          )}
          {isError && errorDebug && (
            <p className="mt-3 max-w-[900px] text-xs font-normal normal-case leading-5 tracking-normal text-[#625b52]">
              <span>Hvis fejlen opstår flere gange, så </span>
              <button
                type="button"
                onClick={() => void copyErrorDebug()}
                aria-live="polite"
                className="cursor-pointer font-semibold text-[#9f211e] underline decoration-current/40 underline-offset-4 transition hover:text-[#6f1715] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
              >
                kopiér fejloplysningerne{isDebugCopied ? " (kopieret)" : ""}
              </button>
              <span> og send dem til mig via </span>
              <button
                type="button"
                onClick={() => void copyErrorContactEmail()}
                aria-live="polite"
                className="cursor-pointer font-semibold text-[#9f211e] underline decoration-current/40 underline-offset-4 transition hover:text-[#6f1715] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
              >
                e-mail{isErrorContactCopied ? " (kopieret)" : ""}
              </button>
              <span>.</span>
            </p>
          )}
        </div>
        {isWorking && <button type="button" onClick={onCancel} className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b655b] underline underline-offset-4 hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25">Annuller</button>}
      </div>
      {isWorking && (
        <div className="mt-4 h-[3px] overflow-hidden bg-[#76866f]/25">
          <div className="h-full bg-[#9f211e] transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

async function transcribeEpisode({ url, apiKey, signal, onProgress, onTranscript }: { url: string; apiKey: string; signal: AbortSignal; onProgress: (event: { phase: "downloading" | "preparing" | "transcribing"; message: string; progress: number }) => void; onTranscript: (value: string) => void }): Promise<string> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
    signal,
  });

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Episoden kunne ikke transskriberes.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finalText = "";
  let streamError = "";
  let streamErrorDebug = "";

  function consume(block: string) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;

    try {
      const event = JSON.parse(data) as { type?: string; delta?: string; text?: string; message?: string; debug?: string; phase?: "downloading" | "preparing" | "transcribing"; progress?: number };
      if (event.type === "transcript.text.delta" && event.delta) {
        accumulated += event.delta;
        onTranscript(accumulated);
      } else if (event.type === "companion.progress" && event.phase && event.message) {
        onProgress({ phase: event.phase, message: event.message, progress: event.progress ?? 0 });
      } else if (event.type === "companion.done" && event.text) {
        finalText = event.text;
        onTranscript(finalText);
      } else if (event.type === "companion.error") {
        streamError = event.message || "Episoden kunne ikke transskriberes.";
        streamErrorDebug = event.debug || "";
      }
    } catch {
      // Ignore non-JSON heartbeat or provider metadata events.
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(consume);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);

  if (streamError) {
    throw new TranscriptionRequestError(streamError, streamErrorDebug);
  }

  return (finalText || accumulated).trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Noget gik galt. Prøv igen.";
}

class TranscriptionRequestError extends Error {
  constructor(message: string, readonly debug: string) {
    super(message);
    this.name = "TranscriptionRequestError";
  }
}

function errorDebugMessage(error: unknown): string {
  return error instanceof TranscriptionRequestError ? error.debug : "";
}

type DiagnosticNavigator = Navigator & {
  deviceMemory?: number;
  userAgentData?: { platform?: string };
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
};

function buildDebugReport({
  message,
  errorDebug,
  episodeUrl,
}: {
  message: string;
  errorDebug: string;
  episodeUrl: string;
}): string {
  const lines = [
    "Hej Enhao,",
    "",
    "Jeg har oplevet denne fejl flere gange:",
    message,
    "",
    `Episode: ${episodeUrl || "Ikke tilgængelig"}`,
    "",
    "Tekniske oplysninger:",
    ...browserDiagnosticLines(),
    "",
    "OpenAI-fejloplysninger:",
    errorDebug,
    "",
  ];
  return lines.join("\n");
}

function browserDiagnosticLines(): string[] {
  if (typeof window === "undefined") return ["Browsermiljø: Ikke tilgængeligt"];

  const diagnosticNavigator = navigator as DiagnosticNavigator;
  const connection = diagnosticNavigator.connection;
  return [
    `Tidspunkt i browser: ${new Date().toISOString()}`,
    `Side: ${window.location.href}`,
    `Browser: ${navigator.userAgent}`,
    `Platform: ${diagnosticNavigator.userAgentData?.platform || navigator.platform || "Ukendt"}`,
    `Sprog: ${navigator.languages.join(", ") || navigator.language || "Ukendt"}`,
    `Tidszone: ${Intl.DateTimeFormat().resolvedOptions().timeZone || "Ukendt"}`,
    `Vindue: ${window.innerWidth} × ${window.innerHeight} px @ ${window.devicePixelRatio}x`,
    `Skærm: ${window.screen.width} × ${window.screen.height} px`,
    `Online: ${navigator.onLine ? "Ja" : "Nej"}`,
    `CPU-tråde: ${navigator.hardwareConcurrency || "Ukendt"}`,
    `Enhedshukommelse: ${diagnosticNavigator.deviceMemory ? `${diagnosticNavigator.deviceMemory} GB` : "Ukendt"}`,
    `Netværk: ${connection?.effectiveType || "Ukendt"}; downlink ${connection?.downlink ?? "ukendt"} Mbit/s; RTT ${connection?.rtt ?? "ukendt"} ms; datasparefunktion ${connection?.saveData ? "til" : "fra/ukendt"}`,
  ];
}

function formatEpisodeMeta(
  episode: { publishedAt?: string; duration?: string },
): string {
  const parts: string[] = [];
  if (episode.publishedAt) {
    const date = new Date(episode.publishedAt);
    if (!Number.isNaN(date.getTime())) {
      parts.push(new Intl.DateTimeFormat("da-DK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date));
    }
  }
  if (episode.duration) {
    parts.push(formatEpisodeDuration(episode.duration));
  }
  return parts.join(" · ");
}

function formatEpisodeDuration(value: string): string {
  const units = value.split(":").map(Number);
  if (units.some((unit) => !Number.isFinite(unit))) return value;

  let totalSeconds = 0;
  for (const unit of units) totalSeconds = totalSeconds * 60 + unit;

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} t.`);
  if (minutes > 0) parts.push(`${minutes} min.`);
  if (parts.length === 0) parts.push("under 1 min.");
  return parts.join(" ");
}
