"use client";

import {
  ProductFooter,
  ProductHeader,
  ProductHero,
} from "@/app/_components/product-chrome";
import { AudioPlayer } from "./_components/audio-player";
import { EpisodePicker } from "./_components/episode-picker";
import { StatusPanel } from "./_components/status-panel";
import { TranscriptView } from "./_components/transcript-view";
import { TranscriptionSetup } from "./_components/transcription-setup";
import { useTranscriptionWorkspace } from "./use-transcription-workspace";

export function HvadSagdeDe() {
  const workspace = useTranscriptionWorkspace();

  return (
    <main className="min-h-screen bg-[#9f211e] p-2.5 text-[#1d1915] sm:p-5 lg:p-7">
      <div className="editorial-sheet min-h-[calc(100vh-20px)] w-full bg-[#f3eddf] px-5 pb-8 pt-6 shadow-[0_24px_80px_rgba(43,8,6,0.28)] sm:min-h-[calc(100vh-40px)] sm:px-10 sm:pb-10 lg:min-h-[calc(100vh-56px)] lg:px-16 lg:pt-9">
        <ProductHeader title="Hva’ sagde de?" />

        <section id="top" className="pt-6 sm:pt-14 lg:pt-16">
          <ProductHero title="Hva’ sagde de?">
            Gør enhver DR LYD-podcastepisode til en tydelig dansk
            transskription — klar til at læse med, mens du lytter.
          </ProductHero>

          <section
            className="mt-6 border-y-2 border-[#9f211e] sm:mt-10"
            aria-label="Lav en transskription"
          >
            <EpisodePicker
              url={workspace.url}
              phase={workspace.phase}
              isWorking={workspace.isWorking}
              cachedEpisodes={workspace.cachedEpisodes}
              latestSuggestion={workspace.latestSuggestion}
              latestGenstartEpisode={workspace.latestGenstartEpisode}
              suggestionsReady={workspace.areEpisodeSuggestionsReady}
              onUrlChange={workspace.setUrl}
              onResolve={(value, selectedCache) =>
                void workspace.resolveEpisode(value, selectedCache)
              }
              onClear={workspace.clearEpisode}
              onRemoveHistory={workspace.removeHistoryEntry}
            />

            {workspace.episode && (
              <TranscriptionSetup
                episode={workspace.episode}
                phase={workspace.phase}
                apiKey={workspace.apiKey}
                isApiKeyInputVisible={workspace.isApiKeyInputVisible}
                isWorking={workspace.isWorking}
                transcriptionMode={workspace.transcriptionMode}
                isPlaying={workspace.isPlaying}
                onTogglePlayback={() => void workspace.toggleEpisodePlayback()}
                onApiKeyChange={workspace.handleApiKey}
                onForgetApiKey={workspace.forgetApiKey}
                onTranscriptionModeChange={workspace.handleTranscriptionMode}
                onTranscribe={() => void workspace.handleTranscribe()}
              />
            )}

            {workspace.phase !== "resolving" &&
              (workspace.isWorking || workspace.message) && (
                <StatusPanel
                  phase={workspace.phase}
                  message={workspace.message}
                  errorDebug={workspace.errorDebug}
                  episodeUrl={workspace.episode?.sourceUrl ?? workspace.url}
                  progress={workspace.progress}
                  isWorking={workspace.isWorking}
                  onCancel={() => workspace.abortRef.current?.abort()}
                />
              )}
          </section>

          {workspace.transcript && (
            <TranscriptView
              key={workspace.episode?.audioUrl}
              episodeTitle={workspace.episode?.episodeTitle}
              transcript={workspace.transcript}
              timedSentences={workspace.timedSentences}
              currentTime={workspace.currentTime}
              isPlayerOpen={workspace.isPlayerOpen}
              apiKey={workspace.apiKey.trim()}
              phase={workspace.phase}
              isCopied={workspace.isCopied}
              onCopy={() => void workspace.copyTranscript()}
              onDownload={workspace.downloadTranscript}
              onSeekTo={(seconds) => void workspace.seekToSentence(seconds)}
            />
          )}
        </section>

        <ProductFooter
          interactionClassName="hover:text-[#9f211e] focus-visible:ring-[#9f211e]/25"
          isCopied={workspace.isContactCopied}
          onContact={() => void workspace.copyContactEmail()}
        />
        {workspace.isPlayerOpen && <div className="h-36 sm:h-28" aria-hidden="true" />}
      </div>

      <AudioPlayer
        audioRef={workspace.audioRef}
        episode={workspace.episode}
        isOpen={workspace.isPlayerOpen}
        isPlaying={workspace.isPlaying}
        currentTime={workspace.currentTime}
        duration={workspace.audioDuration}
        playbackRate={workspace.playbackRate}
        error={workspace.playerError}
        onDurationChange={workspace.setAudioDuration}
        onTimeChange={workspace.updatePlaybackTime}
        onSeekComplete={workspace.finishPlaybackSeek}
        onPlayingChange={workspace.setIsPlaying}
        onRateChange={workspace.setPlaybackRate}
        onReady={() => workspace.setPlayerError("")}
        onError={() => workspace.setPlayerError("Lyden kunne ikke afspilles.")}
        onClose={workspace.closePlayer}
        onToggle={() => void workspace.togglePlayback()}
        onSeek={workspace.seekBy}
      />
    </main>
  );
}
