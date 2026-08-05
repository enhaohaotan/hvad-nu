"use client";

import { useEffect, useRef, useState } from "react";
import { AudioPlayer } from "./components/audio-player";
import { EpisodePicker } from "./components/episode-picker";
import { StatusPanel } from "./components/status-panel";
import { TranscriptView } from "./components/transcript-view";
import { TranscriptionSetup } from "./components/transcription-setup";
import type { DrEpisode } from "@/lib/dr";
import {
  addCachedTranscript,
  findCachedTranscript,
  parseTranscriptCache,
  type TranscriptCacheEntry,
} from "@/lib/transcript-cache";
import {
  errorDebugMessage,
  errorMessage,
  transcribeEpisode,
  type TranscriptionPhase,
} from "@/lib/transcription-client";

// Keep the legacy keys so existing visitors retain their API key and transcripts.
const API_KEY_STORAGE = "danish-listening-companion.openai-api-key";
const TRANSCRIPT_CACHE_STORAGE = "danish-listening-companion.transcripts.v1";
const TRANSCRIPTION_MODEL = "gpt-transcribe";
const GENSTART_REFERENCE_URL =
  "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/sort-mand-paa-plakaten-11802650176";

export function HvadSagdeDe() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyInputVisible, setIsApiKeyInputVisible] = useState(false);
  const [episode, setEpisode] = useState<DrEpisode | null>(null);
  const [phase, setPhase] = useState<TranscriptionPhase>("idle");
  const [message, setMessage] = useState("");
  const [errorDebug, setErrorDebug] = useState("");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [cachedEpisodes, setCachedEpisodes] = useState<TranscriptCacheEntry[]>(
    [],
  );
  const [latestSuggestion, setLatestSuggestion] = useState<{
    referenceUrl: string;
    episode: DrEpisode;
  } | null>(null);
  const [latestGenstartEpisode, setLatestGenstartEpisode] =
    useState<DrEpisode | null>(null);
  const [areEpisodeSuggestionsReady, setAreEpisodeSuggestionsReady] =
    useState(false);
  const [hasLoadedBrowserStorage, setHasLoadedBrowserStorage] = useState(false);
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
      setHasLoadedBrowserStorage(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (copyFeedbackRef.current) clearTimeout(copyFeedbackRef.current);
    };
  }, []);

  const lastGeneratedSourceUrl =
    cachedEpisodes.find((entry) => entry.sourceUrl)?.sourceUrl ?? "";

  useEffect(() => {
    if (!hasLoadedBrowserStorage) return;

    const controller = new AbortController();
    const referenceUrl = lastGeneratedSourceUrl || GENSTART_REFERENCE_URL;

    async function loadLatestEpisode() {
      try {
        const response = await fetch(
          `/api/latest?url=${encodeURIComponent(referenceUrl)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const body = (await response.json()) as { episode?: DrEpisode };
        if (response.ok && body.episode) {
          if (lastGeneratedSourceUrl) {
            setLatestSuggestion({
              referenceUrl: lastGeneratedSourceUrl,
              episode: body.episode,
            });
          } else {
            setLatestGenstartEpisode(body.episode);
          }
        }
      } catch {
        // The input remains usable if DR's feed is temporarily unavailable.
      } finally {
        if (!controller.signal.aborted) setAreEpisodeSuggestionsReady(true);
      }
    }

    void loadLatestEpisode();
    return () => controller.abort();
  }, [hasLoadedBrowserStorage, lastGeneratedSourceUrl]);

  useEffect(() => {
    const sourceUrls = [
      ...new Set(
        cachedEpisodes
          .filter(
            (entry) =>
              entry.sourceUrl && (!entry.publishedAt || !entry.duration),
          )
          .map((entry) => entry.sourceUrl as string),
      ),
    ];
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

      const episodes = resolved.filter(
        (item): item is DrEpisode => Boolean(item),
      );
      if (episodes.length === 0) return;
      setCachedEpisodes((current) => {
        const updated = current.map((entry) => {
          const resolvedEpisode = episodes.find(
            (item) =>
              item.audioUrl === entry.audioUrl ||
              item.sourceUrl === entry.sourceUrl,
          );
          if (!resolvedEpisode) return entry;
          const publishedAt = resolvedEpisode.publishedAt || entry.publishedAt;
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

  async function resolveEpisode(
    value: string,
    selectedCache?: TranscriptCacheEntry,
  ) {
    if (!value.trim()) return;
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
      const response = await fetch(
        `/api/resolve?url=${encodeURIComponent(value)}`,
        { signal: controller.signal, cache: "no-store" },
      );
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
        setMessage(
          "Episoden er transskriberet før — den gemte tekst vises igen",
        );
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
        onTranscript: setTranscript,
      });
      setTranscript(finalText);
      const updatedCache = cacheTranscript(episode, finalText, true);
      if (updatedCache) {
        const nextSourceUrl =
          updatedCache.find((entry) => entry.sourceUrl)?.sourceUrl ?? "";
        if (nextSourceUrl !== lastGeneratedSourceUrl) {
          setAreEpisodeSuggestionsReady(false);
        }
        setCachedEpisodes(updatedCache);
      }

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
    setIsCopied(false);
  }

  function removeHistoryEntry(target: TranscriptCacheEntry) {
    const remainingEntries = cachedEpisodes.filter(
      (entry) =>
        entry.audioUrl !== target.audioUrl ||
        entry.model !== target.model ||
        entry.cachedAt !== target.cachedAt,
    );
    const nextSourceUrl =
      remainingEntries.find((entry) => entry.sourceUrl)?.sourceUrl ?? "";
    if (nextSourceUrl !== lastGeneratedSourceUrl) {
      setAreEpisodeSuggestionsReady(false);
    }

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
    if (isPlayerOpen) await togglePlayback();
    else await openPlayer();
  }

  function seekBy(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.min(
      Math.max(audio.currentTime + seconds, 0),
      limit,
    );
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
    const safeTitle =
      title
        .toLocaleLowerCase("da")
        .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
        .replace(/^-|-$/g, "") || "transskription";
    const href = URL.createObjectURL(
      new Blob([transcript], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = href;
    link.download = `${safeTitle}.txt`;
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
              Gør enhver DR LYD-podcastepisode til en tydelig dansk
              transskription — klar til at læse med, mens du lytter.
            </p>
          </div>

          <section
            className="mt-6 border-y-2 border-[#9f211e] sm:mt-10"
            aria-label="Lav en transskription"
          >
            <EpisodePicker
              url={url}
              phase={phase}
              isWorking={isWorking}
              cachedEpisodes={cachedEpisodes}
              latestSuggestion={latestSuggestion}
              latestGenstartEpisode={latestGenstartEpisode}
              suggestionsReady={areEpisodeSuggestionsReady}
              onUrlChange={setUrl}
              onResolve={(value, selectedCache) =>
                void resolveEpisode(value, selectedCache)
              }
              onClear={clearEpisode}
              onRemoveHistory={removeHistoryEntry}
            />

            {episode && (
              <TranscriptionSetup
                episode={episode}
                phase={phase}
                apiKey={apiKey}
                isApiKeyInputVisible={isApiKeyInputVisible}
                isWorking={isWorking}
                isPlaying={isPlaying}
                onTogglePlayback={() => void toggleEpisodePlayback()}
                onApiKeyChange={handleApiKey}
                onForgetApiKey={forgetApiKey}
                onTranscribe={() => void handleTranscribe()}
              />
            )}

            {phase !== "resolving" && (isWorking || message) && (
              <StatusPanel
                phase={phase}
                message={message}
                errorDebug={errorDebug}
                episodeUrl={episode?.sourceUrl ?? url}
                progress={progress}
                isWorking={isWorking}
                onCancel={() => abortRef.current?.abort()}
              />
            )}
          </section>

          {transcript && (
            <TranscriptView
              episodeTitle={episode?.episodeTitle}
              transcript={transcript}
              phase={phase}
              isCopied={isCopied}
              onCopy={() => void copyTranscript()}
              onDownload={downloadTranscript}
            />
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

      <AudioPlayer
        audioRef={audioRef}
        episode={episode}
        isOpen={isPlayerOpen}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={audioDuration}
        playbackRate={playbackRate}
        error={playerError}
        onDurationChange={setAudioDuration}
        onTimeChange={setCurrentTime}
        onPlayingChange={setIsPlaying}
        onRateChange={setPlaybackRate}
        onReady={() => setPlayerError("")}
        onError={() => setPlayerError("Lyden kunne ikke afspilles.")}
        onClose={closePlayer}
        onToggle={() => void togglePlayback()}
        onSeek={seekBy}
      />
    </main>
  );
}

function readCachedTranscript(audioUrl: string): string {
  try {
    const entries = parseTranscriptCache(
      localStorage.getItem(TRANSCRIPT_CACHE_STORAGE),
    );
    return (
      findCachedTranscript(entries, audioUrl, TRANSCRIPTION_MODEL)?.transcript ??
      ""
    );
  } catch {
    return "";
  }
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
