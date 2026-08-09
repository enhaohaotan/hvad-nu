"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ProductFooter,
  ProductHeader,
  ProductHero,
} from "@/app/_components/product-chrome";
import { AudioPlayer } from "../_components/audio-player";
import { EpisodePicker } from "../_components/episode-picker";
import { StatusPanel } from "../_components/status-panel";
import { TranscriptView } from "../_components/transcript-view";
import { DemoTranscriptionSetup } from "./demo-transcription-setup";
import type { DrEpisode } from "@/lib/dr";
import type { TimedSentence } from "@/lib/timed-transcript";
import type { TranscriptCacheEntry } from "@/lib/transcript-cache";

const SOURCE_URL =
  "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/tate-broedre-buret-inde-11802650181";

const FALLBACK_EPISODE: DrEpisode = {
  id: "demo-tate",
  showTitle: "Genstart",
  episodeTitle: "Tate-brødre buret inde",
  description: "",
  duration: "00:23:41",
  publishedAt: "2026-08-04T03:00:00+02:00",
  imageUrl: "",
  audioUrl: "",
  sourceUrl: SOURCE_URL,
};

const DEMO_HISTORY: TranscriptCacheEntry[] = [
  {
    audioUrl: "demo:tate-broedre-buret-inde",
    model: "demo",
    transcript: "",
    cachedAt: Date.UTC(2026, 7, 5, 18, 49),
    firstGeneratedAt: Date.UTC(2026, 7, 5, 18, 49),
    sourceUrl: SOURCE_URL,
    episodeTitle: FALLBACK_EPISODE.episodeTitle,
    showTitle: FALLBACK_EPISODE.showTitle,
    publishedAt: FALLBACK_EPISODE.publishedAt,
    duration: FALLBACK_EPISODE.duration,
  },
];

export function DemoPage({
  episodeTitle,
  transcript,
  timedSentences,
  englishTranslations,
}: {
  episodeTitle: string;
  transcript: string;
  timedSentences: TimedSentence[];
  englishTranslations: string[];
}) {
  const [episode, setEpisode] = useState(FALLBACK_EPISODE);
  const [isCopied, setIsCopied] = useState(false);
  const [isContactCopied, setIsContactCopied] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playerError, setPlayerError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const copyFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/resolve?url=${encodeURIComponent(SOURCE_URL)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { episode?: DrEpisode };
        if (body.episode) setEpisode(body.episode);
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
      if (copyFeedbackRef.current) clearTimeout(copyFeedbackRef.current);
    };
  }, []);

  function showTranscript() {
    transcriptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !episode.audioUrl) return;
    setPlayerError("");
    setIsPlayerOpen(true);
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {
      setPlayerError("Lyden kunne ikke afspilles.");
    }
  }

  async function seekToSentence(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !episode.audioUrl) return;
    setIsPlayerOpen(true);
    setCurrentTime(seconds);
    audio.currentTime = seconds;
    try {
      await audio.play();
    } catch {
      setPlayerError("Lyden kunne ikke afspilles.");
    }
  }

  async function copyTranscript() {
    await navigator.clipboard.writeText(transcript);
    setIsCopied(true);
    if (copyFeedbackRef.current) clearTimeout(copyFeedbackRef.current);
    copyFeedbackRef.current = setTimeout(() => setIsCopied(false), 2000);
  }

  function downloadTranscript() {
    const href = URL.createObjectURL(
      new Blob([transcript], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = href;
    link.download = "tate-broedre-buret-inde.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  async function copyContactEmail() {
    await navigator.clipboard.writeText("enhaohao.tan@gmail.com");
    setIsContactCopied(true);
    setTimeout(() => setIsContactCopied(false), 2000);
  }

  return (
    <>
      <aside className="sticky top-0 z-50 flex min-h-11 items-center justify-between gap-4 bg-[#1d1915] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f8f2e6] sm:px-7 sm:text-xs">
        <span>Demo · Ingen AI-kald eller betaling</span>
        <Link
          href="/hvadsagdede"
          className="shrink-0 underline decoration-current/40 underline-offset-4 transition hover:text-[#e8a19a] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Til produktet →
        </Link>
      </aside>

      <main className="min-h-screen bg-[#9f211e] p-2.5 text-[#1d1915] sm:p-5 lg:p-7">
        <div className="editorial-sheet min-h-[calc(100vh-64px)] w-full bg-[#f3eddf] px-5 pb-8 pt-6 shadow-[0_24px_80px_rgba(43,8,6,0.28)] sm:px-10 sm:pb-10 lg:px-16 lg:pt-9">
          <ProductHeader title="Hva’ sagde de?" secondaryText="Interaktiv demonstration" />

          <section id="top" className="pt-6 sm:pt-14 lg:pt-16">
            <ProductHero title="Hva’ sagde de?">
              Prøv hele siden med en færdig transskription — uden API-nøgle,
              knaptryk eller ventetid.
            </ProductHero>

            <section
              className="mt-6 border-y-2 border-[#9f211e] sm:mt-10"
              aria-label="Færdig demo-transskription"
            >
              <EpisodePicker
                url={SOURCE_URL}
                phase="done"
                isWorking={false}
                cachedEpisodes={DEMO_HISTORY}
                latestSuggestion={{ referenceUrl: SOURCE_URL, episode }}
                latestGenstartEpisode={episode}
                suggestionsReady
                readOnly
                onUrlChange={() => undefined}
                onResolve={showTranscript}
                onClear={() => undefined}
                onRemoveHistory={() => undefined}
              />

              <DemoTranscriptionSetup
                episode={episode}
                isPlaying={isPlaying}
                onTogglePlayback={() => void togglePlayback()}
                onShowTranscript={showTranscript}
              />

              <StatusPanel
                phase="done"
                message="Episoden er transskriberet — den færdige tekst vises nedenfor"
                errorDebug=""
                episodeUrl={SOURCE_URL}
                progress={100}
                isWorking={false}
                onCancel={() => undefined}
              />
            </section>

            <div ref={transcriptRef}>
              <TranscriptView
                episodeTitle={episodeTitle}
                transcript={transcript}
                timedSentences={timedSentences}
                currentTime={currentTime}
                isPlayerOpen={isPlayerOpen}
                apiKey=""
                phase="done"
                isCopied={isCopied}
                presetTranslations={{ en: englishTranslations }}
                availableTranslationLanguages={["en"]}
                hasStickyTopBanner
                initialShowTranslation
                onCopy={() => void copyTranscript()}
                onDownload={downloadTranscript}
                onSeekTo={(seconds) => void seekToSentence(seconds)}
              />
            </div>
          </section>

          <ProductFooter
            interactionClassName="hover:text-[#9f211e] focus-visible:ring-[#9f211e]/25"
            isCopied={isContactCopied}
            onContact={() => void copyContactEmail()}
          />
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
          onSeekComplete={setCurrentTime}
          onPlayingChange={setIsPlaying}
          onRateChange={setPlaybackRate}
          onReady={() => setPlayerError("")}
          onError={() => setPlayerError("Lyden kunne ikke afspilles.")}
          onClose={() => {
            audioRef.current?.pause();
            setIsPlayerOpen(false);
            setIsPlaying(false);
          }}
          onToggle={() => void togglePlayback()}
          onSeek={(seconds) => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.currentTime = Math.max(0, audio.currentTime + seconds);
            setCurrentTime(audio.currentTime);
          }}
        />
      </main>
    </>
  );
}
