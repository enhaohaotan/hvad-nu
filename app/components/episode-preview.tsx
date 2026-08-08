import type { DrEpisode } from "@/lib/dr";
import { formatEpisodeMeta } from "@/lib/episode-format";

export function EpisodePreview({
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
        <img
          src={episode.imageUrl}
          alt=""
          className="h-28 w-28 border border-[#29231b]/30 object-cover grayscale-[18%]"
        />
      ) : (
        <div
          className="flex h-28 w-28 items-center justify-center border border-[#29231b]/30 bg-[#e4dccb] text-2xl"
          aria-hidden="true"
        >
          ♪
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9f211e]">
          {episode.showTitle}
        </p>
        <h2 className="editorial-serif mt-2 line-clamp-3 pb-1 text-2xl leading-[1.15] tracking-[-0.03em] sm:text-3xl">
          {episode.episodeTitle}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b655b]">
            {formatEpisodeMeta(episode)}
          </p>
          <button
            type="button"
            onClick={(event) => {
              if (event.detail > 0) event.currentTarget.blur();
              onPlay();
            }}
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
