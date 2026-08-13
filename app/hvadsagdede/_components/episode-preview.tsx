"use client";

import { useId, useState } from "react";
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
  const descriptionId = useId();
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(
    null,
  );
  const isDescriptionExpanded = expandedEpisodeId === episode.id;

  return (
    <div className="grid gap-5 sm:grid-cols-[112px_1fr] sm:items-start">
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
        {episode.description && (
          <div className="mt-2 max-w-3xl">
            <p
              id={descriptionId}
              className={`${isDescriptionExpanded ? "" : "line-clamp-3"} text-[12px] leading-5 text-[#625b52] sm:text-[13px] sm:leading-5`}
            >
              {episode.description}
            </p>
            <button
              type="button"
              aria-controls={descriptionId}
              aria-expanded={isDescriptionExpanded}
              onClick={() =>
                setExpandedEpisodeId(
                  isDescriptionExpanded ? null : episode.id,
                )
              }
              className="mt-1 cursor-pointer text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9f211e] underline decoration-current/40 underline-offset-4 transition hover:text-[#6f1715] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
            >
              {isDescriptionExpanded ? "Vis mindre" : "Vis mere"}
            </button>
          </div>
        )}
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
