"use client";

import { useEffect, useRef, useState } from "react";
import type { DrEpisode } from "@/lib/dr";
import type { TimedSentence } from "@/lib/timed-transcript";
import {
  DEFAULT_TRANSCRIPTION_MODE,
  isTranscriptionMode,
  TRANSCRIPTION_MODES,
  type TranscriptionMode,
} from "@/lib/transcription-mode";
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
import { GENSTART_REFERENCE_URL, STORAGE_KEYS } from "./constants";

export function useTranscriptionWorkspace() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [transcriptionMode, setTranscriptionMode] =
    useState<TranscriptionMode>(DEFAULT_TRANSCRIPTION_MODE);
  const [isApiKeyInputVisible, setIsApiKeyInputVisible] = useState(false);
  const [episode, setEpisode] = useState<DrEpisode | null>(null);
  const [phase, setPhase] = useState<TranscriptionPhase>("idle");
  const [message, setMessage] = useState("");
  const [errorDebug, setErrorDebug] = useState("");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [timedSentences, setTimedSentences] = useState<TimedSentence[]>([]);
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
  const pendingSeekRef = useRef<number | null>(null);
  const hasCompletedSeekRef = useRef(false);
  const seekFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let storedKey = "";
    let storedMode = DEFAULT_TRANSCRIPTION_MODE;
    let storedTranscripts: TranscriptCacheEntry[] = [];
    try {
      storedKey = localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
      const savedMode = localStorage.getItem(STORAGE_KEYS.transcriptionMode);
      if (savedMode && isTranscriptionMode(savedMode)) storedMode = savedMode;
      storedTranscripts = parseTranscriptCache(
        localStorage.getItem(STORAGE_KEYS.transcriptCache),
      );
    } catch {
      // Browser storage can be unavailable in hardened privacy modes.
    }
    const frame = requestAnimationFrame(() => {
      setApiKey(storedKey);
      setTranscriptionMode(storedMode);
      setIsApiKeyInputVisible(!storedKey);
      setCachedEpisodes(storedTranscripts);
      setHasLoadedBrowserStorage(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (copyFeedbackRef.current) clearTimeout(copyFeedbackRef.current);
      if (seekFallbackRef.current) clearTimeout(seekFallbackRef.current);
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
            STORAGE_KEYS.transcriptCache,
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
      setTimedSentences([]);
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
    setTimedSentences([]);
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
          ? selectedCache
          : readCachedTranscript(body.episode.audioUrl, transcriptionMode);
      if (cachedTranscript) {
        setTranscript(cachedTranscript.transcript);
        setTimedSentences(cachedTranscript.timedSentences ?? []);
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
      if (value) localStorage.setItem(STORAGE_KEYS.apiKey, value);
      else localStorage.removeItem(STORAGE_KEYS.apiKey);
    } catch {
      // The input still works for this session when storage is unavailable.
    }
  }

  function forgetApiKey() {
    handleApiKey("");
    setIsApiKeyInputVisible(true);
  }

  function handleTranscriptionMode(mode: TranscriptionMode) {
    setTranscriptionMode(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.transcriptionMode, mode);
    } catch {
      // Keep the selected mode for this session.
    }
  }

  async function handleTranscribe() {
    if (!episode || !apiKey.trim() || isWorking) return;

    setIsApiKeyInputVisible(false);
    const controller = new AbortController();
    abortRef.current = controller;
    setTranscript("");
    setTimedSentences([]);
    setMessage("Downloader episoden fra DR LYD…");
    setErrorDebug("");
    setProgress(0);
    setPhase("downloading");
    setIsCopied(false);

    try {
      const result = await transcribeEpisode({
        url: episode.sourceUrl,
        apiKey: apiKey.trim(),
        mode: transcriptionMode,
        signal: controller.signal,
        onProgress(event) {
          setPhase(event.phase);
          setMessage(event.message);
          setProgress(event.progress);
        },
        onTranscript: setTranscript,
        onTimedSentences: setTimedSentences,
      });
      setTranscript(result.text);
      setTimedSentences(result.sentences);
      const updatedCache = cacheTranscript(
        episode,
        result.text,
        result.sentences,
        transcriptionMode,
        true,
      );
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
    setTimedSentences([]);
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
            STORAGE_KEYS.transcriptCache,
            JSON.stringify(updated),
          );
        } else {
          localStorage.removeItem(STORAGE_KEYS.transcriptCache);
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
    const target = Math.min(
      Math.max(audio.currentTime + seconds, 0),
      limit,
    );
    beginPendingSeek(target);
    audio.currentTime = target;
  }

  async function seekToSentence(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : seconds;
    const target = Math.min(Math.max(seconds, 0), limit);
    setIsPlayerOpen(true);
    beginPendingSeek(target);
    audio.currentTime = target;
    setPlayerError("");
    try {
      await audio.play();
    } catch {
      setPlayerError("Lyden kunne ikke afspilles.");
    }
  }

  function closePlayer() {
    audioRef.current?.pause();
    clearPendingSeek();
    setIsPlayerOpen(false);
    setIsPlaying(false);
    setPlayerError("");
  }

  function resetPlayer() {
    clearPendingSeek();
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

  function updatePlaybackTime(value: number) {
    const pendingTarget = pendingSeekRef.current;
    if (pendingTarget !== null) {
      if (!hasCompletedSeekRef.current || value < pendingTarget) return;
      clearPendingSeek();
    }
    setCurrentTime(value);
  }

  function finishPlaybackSeek(value: number) {
    const pendingTarget = pendingSeekRef.current;
    if (pendingTarget === null) {
      setCurrentTime(value);
      return;
    }
    hasCompletedSeekRef.current = true;
    if (value >= pendingTarget) {
      clearPendingSeek();
      setCurrentTime(value);
    } else {
      setCurrentTime(pendingTarget);
    }
  }

  function beginPendingSeek(target: number) {
    clearPendingSeek();
    pendingSeekRef.current = target;
    hasCompletedSeekRef.current = false;
    setCurrentTime(target);
    seekFallbackRef.current = setTimeout(() => {
      if (pendingSeekRef.current !== target) return;
      pendingSeekRef.current = null;
      hasCompletedSeekRef.current = false;
      seekFallbackRef.current = null;
      setCurrentTime(Math.max(audioRef.current?.currentTime ?? target, target));
    }, 1500);
  }

  function clearPendingSeek() {
    pendingSeekRef.current = null;
    hasCompletedSeekRef.current = false;
    if (seekFallbackRef.current) clearTimeout(seekFallbackRef.current);
    seekFallbackRef.current = null;
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

  return {
    abortRef,
    apiKey,
    areEpisodeSuggestionsReady,
    audioDuration,
    audioRef,
    cachedEpisodes,
    clearEpisode,
    closePlayer,
    copyContactEmail,
    copyTranscript,
    currentTime,
    downloadTranscript,
    episode,
    errorDebug,
    finishPlaybackSeek,
    forgetApiKey,
    handleApiKey,
    handleTranscribe,
    handleTranscriptionMode,
    isApiKeyInputVisible,
    isContactCopied,
    isCopied,
    isPlayerOpen,
    isPlaying,
    isWorking,
    latestGenstartEpisode,
    latestSuggestion,
    message,
    phase,
    playbackRate,
    playerError,
    progress,
    removeHistoryEntry,
    resolveEpisode,
    seekBy,
    seekToSentence,
    setAudioDuration,
    setIsPlaying,
    setPlaybackRate,
    setPlayerError,
    setUrl,
    timedSentences,
    toggleEpisodePlayback,
    togglePlayback,
    transcript,
    transcriptionMode,
    updatePlaybackTime,
    url,
  };
}

function readCachedTranscript(
  audioUrl: string,
  mode: TranscriptionMode,
): TranscriptCacheEntry | undefined {
  try {
    const entries = parseTranscriptCache(
      localStorage.getItem(STORAGE_KEYS.transcriptCache),
    );
    return findCachedTranscript(
      entries,
      audioUrl,
      TRANSCRIPTION_MODES[mode].modelKey,
    );
  } catch {
    return undefined;
  }
}

function cacheTranscript(
  episode: DrEpisode,
  transcript: string,
  timedSentences: TimedSentence[],
  mode: TranscriptionMode,
  createNewVersion = false,
): TranscriptCacheEntry[] | null {
  try {
    const entries = parseTranscriptCache(
      localStorage.getItem(STORAGE_KEYS.transcriptCache),
    );
    const previousVersion = findCachedTranscript(
      entries,
      episode.audioUrl,
      TRANSCRIPTION_MODES[mode].modelKey,
    );
    const updated = addCachedTranscript(
      entries,
      {
        audioUrl: episode.audioUrl,
        model: TRANSCRIPTION_MODES[mode].modelKey,
        transcript,
        timedSentences,
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
    localStorage.setItem(STORAGE_KEYS.transcriptCache, JSON.stringify(updated));
    return updated;
  } catch {
    // A full or unavailable browser store must not interrupt transcription.
    return null;
  }
}
