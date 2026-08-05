import type { DrEpisode } from "@/lib/dr";
import type { TranscriptionPhase } from "@/lib/transcription-client";
import { ApiKeyPanel } from "./api-key-panel";
import { EpisodePreview } from "./episode-preview";
import { StepLabel } from "./step-label";

export function TranscriptionSetup({
  episode,
  phase,
  apiKey,
  isApiKeyInputVisible,
  isWorking,
  isPlaying,
  onTogglePlayback,
  onApiKeyChange,
  onForgetApiKey,
  onTranscribe,
}: {
  episode: DrEpisode;
  phase: TranscriptionPhase;
  apiKey: string;
  isApiKeyInputVisible: boolean;
  isWorking: boolean;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onApiKeyChange: (value: string) => void;
  onForgetApiKey: () => void;
  onTranscribe: () => void;
}) {
  return (
    <div className="border-t border-[#9f211e]/45">
      <div className="grid lg:grid-cols-[190px_1fr]">
        <div className="border-b border-[#9f211e]/35 py-5 lg:border-b-0 lg:border-r lg:pr-8">
          <StepLabel number="02" label="Gennemse og transskriber" />
        </div>
        <div className="py-6 lg:pl-8">
          <EpisodePreview
            episode={episode}
            isPlaying={isPlaying}
            onPlay={onTogglePlayback}
          />
          <ApiKeyPanel
            apiKey={apiKey}
            isInputVisible={isApiKeyInputVisible}
            isWorking={isWorking}
            onChange={onApiKeyChange}
            onForget={onForgetApiKey}
          />
          <button
            type="button"
            onClick={onTranscribe}
            disabled={!apiKey.trim() || isWorking}
            className="mt-6 flex min-h-[56px] w-full items-center justify-between bg-[#9f211e] px-6 text-xs font-semibold uppercase tracking-[0.15em] text-[#f8f2e6] transition enabled:hover:bg-[#851b18] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>
              {phase === "done"
                ? "Lav ny transskription"
                : "Lav transskription"}
            </span>
            <span className="text-lg" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
