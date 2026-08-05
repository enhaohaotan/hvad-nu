"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AudioPlayer } from "../components/audio-player";
import { EpisodePicker } from "../components/episode-picker";
import { StatusPanel } from "../components/status-panel";
import { TranscriptView } from "../components/transcript-view";
import { DemoTranscriptionSetup } from "./demo-transcription-setup";
import type { DrEpisode } from "@/lib/dr";
import type { TranscriptCacheEntry } from "@/lib/transcript-cache";
import type { TranscriptionPhase } from "@/lib/transcription-client";

type DemoEpisodeConfig = {
  sourceUrl: string;
  transcriptUrl: string;
  downloadName: string;
  episodeTitle: string;
  publishedAt: string;
  duration: string;
};

const DEMO_EPISODES: DemoEpisodeConfig[] = [
  {
    sourceUrl:
      "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/efterladt-paa-perronen-11802650175",
    transcriptUrl: "/demo/efterladt-paa-perronen.txt",
    downloadName: "efterladt-paa-perronen.txt",
    episodeTitle: "Efterladt på perronen",
    publishedAt: "2026-07-27T00:00:00.000Z",
    duration: "00:24:00",
  },
  {
    sourceUrl:
      "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/sort-mand-paa-plakaten-11802650176",
    transcriptUrl: "/demo/sort-mand-paa-plakaten.txt",
    downloadName: "sort-mand-paa-plakaten.txt",
    episodeTitle: "Sort mand på plakaten",
    publishedAt: "2026-07-28T00:00:00.000Z",
    duration: "00:20:00",
  },
  {
    sourceUrl:
      "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/madonna-er-tilbage-11802650179",
    transcriptUrl: "/demo/madonna-er-tilbage.txt",
    downloadName: "madonna-er-tilbage.txt",
    episodeTitle: "Madonna er tilbage",
    publishedAt: "2026-07-31T00:00:00.000Z",
    duration: "00:24:00",
  },
];

const INITIAL_DEMO = DEMO_EPISODES[0];
const LATEST_DEMO = DEMO_EPISODES[2];
const LATEST_EPISODE: DrEpisode = {
  id: "demo-madonna",
  showTitle: "Genstart",
  episodeTitle: LATEST_DEMO.episodeTitle,
  description: "",
  duration: LATEST_DEMO.duration,
  publishedAt: LATEST_DEMO.publishedAt,
  imageUrl: "",
  audioUrl: "demo:madonna-er-tilbage",
  sourceUrl: LATEST_DEMO.sourceUrl,
};

const INITIAL_HISTORY: TranscriptCacheEntry[] = DEMO_EPISODES.slice(0, 2).map(
  (item, index) => ({
    audioUrl: `demo:${item.downloadName}`,
    model: "demo",
    transcript: "",
    cachedAt: Date.UTC(2026, 7, 5, 18, 49 - index * 6),
    firstGeneratedAt: Date.UTC(2026, 7, 5, 18, 49 - index * 6),
    sourceUrl: item.sourceUrl,
    episodeTitle: item.episodeTitle,
    showTitle: "Genstart",
    publishedAt: item.publishedAt,
    duration: item.duration,
  }),
);

export function DemoPage() {
  const [url, setUrl] = useState(INITIAL_DEMO.sourceUrl);
  const [activeDemo, setActiveDemo] = useState(INITIAL_DEMO);
  const [episode, setEpisode] = useState<DrEpisode | null>(null);
  const [phase, setPhase] = useState<TranscriptionPhase>("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [demoTranscripts, setDemoTranscripts] = useState<
    Record<string, string>
  >({});
  const [demoHistory, setDemoHistory] =
    useState<TranscriptCacheEntry[]>(INITIAL_HISTORY);
  const [isCopied, setIsCopied] = useState(false);
  const [isContactCopied, setIsContactCopied] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playerError, setPlayerError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveAbortRef = useRef<AbortController | null>(null);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const copyFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(
      DEMO_EPISODES.map(async (item) => {
        const response = await fetch(item.transcriptUrl, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Demo transcript unavailable");
        return [item.sourceUrl, await response.text()] as const;
      }),
    )
      .then((entries) => setDemoTranscripts(Object.fromEntries(entries)))
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessage("Demoens transskription kunne ikke indlæses.");
          setPhase("error");
        }
      });

    return () => {
      controller.abort();
      resolveAbortRef.current?.abort();
      if (simulationRef.current) clearInterval(simulationRef.current);
      if (copyFeedbackRef.current) clearTimeout(copyFeedbackRef.current);
    };
  }, []);

  const isWorking = [
    "resolving",
    "downloading",
    "preparing",
    "transcribing",
  ].includes(phase);

  function handleUrlChange(value: string) {
    const selectedDemo = findDemoEpisode(value);
    if (!selectedDemo) return;
    setUrl(value);
  }

  async function loadDemoTranscript(item: DemoEpisodeConfig) {
    const existing = demoTranscripts[item.sourceUrl];
    if (existing) return existing;
    const response = await fetch(item.transcriptUrl);
    if (!response.ok) throw new Error("Demo transcript unavailable");
    const loaded = await response.text();
    setDemoTranscripts((current) => ({
      ...current,
      [item.sourceUrl]: loaded,
    }));
    return loaded;
  }

  async function resolveDemoEpisode(
    value: string,
    selectedCache?: TranscriptCacheEntry,
  ) {
    if (isWorking) return;
    const selectedDemo = findDemoEpisode(value);
    if (!selectedDemo) return;
    resetPlayer();
    resolveAbortRef.current?.abort();
    const controller = new AbortController();
    resolveAbortRef.current = controller;
    setUrl(selectedDemo.sourceUrl);
    setActiveDemo(selectedDemo);
    setEpisode(null);
    setTranscript("");
    setPhase("resolving");
    setMessage("Finder demoepisoden i DR LYD…");
    setProgress(6);

    try {
      const response = await fetch(
        `/api/resolve?url=${encodeURIComponent(selectedDemo.sourceUrl)}`,
        { signal: controller.signal, cache: "no-store" },
      );
      const body = (await response.json()) as {
        episode?: DrEpisode;
        error?: string;
      };
      if (!response.ok || !body.episode) {
        throw new Error(body.error || "Demoepisoden kunne ikke findes.");
      }
      setEpisode(body.episode);
      if (selectedCache) {
        const savedTranscript = await loadDemoTranscript(selectedDemo);
        setTranscript(savedTranscript);
        setPhase("done");
        setMessage(
          "Episoden er transskriberet før — den gemte tekst vises igen",
        );
        setProgress(100);
      } else {
        setPhase("ready");
        setMessage("Demoepisoden er fundet — klar til simulering");
        setProgress(0);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Demoepisoden kunne ikke findes.",
      );
      setProgress(0);
    }
  }

  async function startSimulation() {
    if (!episode || isWorking) return;
    let preparedTranscript = "";
    try {
      preparedTranscript = await loadDemoTranscript(activeDemo);
    } catch {
      setPhase("error");
      setMessage("Demoens transskription kunne ikke indlæses.");
      return;
    }

    if (simulationRef.current) clearInterval(simulationRef.current);
    setTranscript("");
    setIsCopied(false);
    setPhase("downloading");
    setMessage("Downloader episoden fra DR LYD…");
    setProgress(0);

    let nextProgress = 0;
    simulationRef.current = setInterval(() => {
      nextProgress = Math.min(nextProgress + 2, 100);
      setProgress(nextProgress);

      if (nextProgress < 20) {
        setPhase("downloading");
        setMessage("Downloader episoden fra DR LYD…");
      } else if (nextProgress < 32) {
        setPhase("preparing");
        setMessage("Opdeler lydfilen i mindre dele…");
      } else if (nextProgress < 100) {
        const transcriptionProgress = (nextProgress - 32) / 68;
        const chunk = Math.min(
          3,
          Math.max(1, Math.ceil(transcriptionProgress * 3)),
        );
        setPhase("transcribing");
        setMessage(`Transskriberer lyddel ${chunk} af 3…`);
        setTranscript(
          preparedTranscript.slice(
            0,
            Math.floor(preparedTranscript.length * transcriptionProgress),
          ),
        );
      } else {
        if (simulationRef.current) clearInterval(simulationRef.current);
        simulationRef.current = null;
        setTranscript(preparedTranscript);
        setPhase("done");
        setMessage("Demo-transskriptionen er klar");
      }
    }, 180);
  }

  function cancelDemo() {
    resolveAbortRef.current?.abort();
    if (simulationRef.current) clearInterval(simulationRef.current);
    simulationRef.current = null;
    setPhase(episode ? "ready" : "idle");
    setMessage("");
    setProgress(0);
    setTranscript("");
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
    const href = URL.createObjectURL(
      new Blob([transcript], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = href;
    link.download = activeDemo.downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <>
      <aside className="sticky top-0 z-50 flex min-h-11 items-center justify-between gap-4 bg-[#1d1915] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f8f2e6] sm:px-7 sm:text-xs">
        <span>
          Demo · Ingen AI-kald eller betaling · Flere funktioner på hovedsiden
        </span>
        <Link
          href="/"
          className="shrink-0 underline decoration-current/40 underline-offset-4 transition hover:text-[#e8a19a] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Gå til hovedsiden →
        </Link>
      </aside>

      <main className="min-h-screen bg-[#9f211e] p-2.5 text-[#1d1915] sm:p-5 lg:p-7">
        <div className="editorial-sheet min-h-[calc(100vh-64px)] w-full bg-[#f3eddf] px-5 pb-8 pt-6 shadow-[0_24px_80px_rgba(43,8,6,0.28)] sm:px-10 sm:pb-10 lg:px-16 lg:pt-9">
          <header className="flex items-center justify-between gap-4 border-b border-[#262018]/70 pb-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] sm:pb-3 sm:text-xs sm:tracking-[0.18em]">
            <span>Hva’ sagde de?</span>
            <span className="text-right text-[#66745e]">
              Interaktiv demonstration
            </span>
          </header>

          <section id="top" className="pt-6 sm:pt-14 lg:pt-16">
            <h1 className="editorial-serif text-[clamp(3rem,13vw,4.75rem)] uppercase leading-[0.86] tracking-[-0.06em] sm:text-[clamp(5rem,8vw,8.5rem)] sm:leading-[0.82] sm:tracking-[-0.065em]">
              Hva’ sagde de?
            </h1>
            <p className="editorial-serif mt-5 w-full text-[13px] leading-5 text-[#4b463f] sm:mt-7 sm:text-base sm:leading-7">
              Prøv hele forløbet med en færdig transskription — uden API-nøgle
              og uden betaling.
            </p>

            <section
              className="mt-6 border-y-2 border-[#9f211e] sm:mt-10"
              aria-label="Prøv en demo-transskription"
            >
              <EpisodePicker
                url={url}
                phase={phase}
                isWorking={isWorking}
                cachedEpisodes={demoHistory}
                latestSuggestion={
                  demoHistory[0]?.sourceUrl
                    ? {
                        referenceUrl: demoHistory[0].sourceUrl,
                        episode: LATEST_EPISODE,
                      }
                    : null
                }
                latestGenstartEpisode={LATEST_EPISODE}
                suggestionsReady
                readOnly
                onUrlChange={handleUrlChange}
                onResolve={(value, selectedCache) =>
                  void resolveDemoEpisode(value, selectedCache)
                }
                onClear={() => undefined}
                onRemoveHistory={(entry) =>
                  setDemoHistory((current) =>
                    current.filter(
                      (candidate) =>
                        candidate.audioUrl !== entry.audioUrl ||
                        candidate.cachedAt !== entry.cachedAt,
                    ),
                  )
                }
              />

              {episode && (
                <DemoTranscriptionSetup
                  episode={episode}
                  phase={phase}
                  isWorking={isWorking}
                  isPlaying={isPlaying}
                  onTogglePlayback={() => void toggleEpisodePlayback()}
                  onTranscribe={() => void startSimulation()}
                />
              )}

              {(isWorking || message) && (
                <StatusPanel
                  phase={phase}
                  message={message}
                  errorDebug=""
                  episodeUrl={url}
                  progress={progress}
                  isWorking={isWorking}
                  onCancel={cancelDemo}
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
    </>
  );
}

function findDemoEpisode(value: string): DemoEpisodeConfig | undefined {
  return DEMO_EPISODES.find((item) => item.sourceUrl === value);
}
