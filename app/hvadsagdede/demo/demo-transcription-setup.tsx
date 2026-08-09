import { StepLabel } from "@/app/_components/step-label";
import { EpisodePreview } from "../_components/episode-preview";
import type { DrEpisode } from "@/lib/dr";

export function DemoTranscriptionSetup({
  episode,
  isPlaying,
  onTogglePlayback,
  onShowTranscript,
}: {
  episode: DrEpisode;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onShowTranscript: () => void;
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

          <div className="mt-7 border-t border-[#29231b]/20 pt-6">
            <p className="editorial-serif text-xl">OpenAI API-nøgle</p>
            <p className="mt-3 w-full border border-[#76866f]/40 bg-[#76866f]/5 px-4 py-3 text-xs font-semibold text-[#4f5f49]">
              Demoen kræver ingen API-nøgle
            </p>
            <p className="mt-2 text-xs leading-5 text-[#6b655b]">
              Demoen bruger en allerede færdig transskription og foretager
              ingen AI-kald.
            </p>
          </div>

          <button
            type="button"
            onClick={onShowTranscript}
            className="mt-6 flex min-h-[56px] w-full items-center justify-between bg-[#9f211e] px-6 text-xs font-semibold uppercase tracking-[0.15em] text-[#f8f2e6] transition hover:bg-[#851b18] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/30"
          >
            <span>Se den færdige transskription</span>
            <span className="text-lg" aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
    </div>
  );
}
