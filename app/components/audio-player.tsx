import type { RefObject } from "react";
import type { DrEpisode } from "@/lib/dr";
import { formatPlaybackTime } from "@/lib/episode-format";

export function AudioPlayer({
  audioRef,
  episode,
  isOpen,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  error,
  onDurationChange,
  onTimeChange,
  onPlayingChange,
  onRateChange,
  onReady,
  onError,
  onClose,
  onToggle,
  onSeek,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  episode: DrEpisode | null;
  isOpen: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  error: string;
  onDurationChange: (value: number) => void;
  onTimeChange: (value: number) => void;
  onPlayingChange: (value: boolean) => void;
  onRateChange: (value: number) => void;
  onReady: () => void;
  onError: () => void;
  onClose: () => void;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
}) {
  return (
    <>
      {episode && (
        <audio
          key={episode.audioUrl}
          ref={audioRef}
          preload="metadata"
          src={episode.audioUrl}
          onLoadedMetadata={(event) =>
            onDurationChange(event.currentTarget.duration)
          }
          onDurationChange={(event) =>
            onDurationChange(event.currentTarget.duration)
          }
          onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime)}
          onPlay={() => onPlayingChange(true)}
          onPause={() => onPlayingChange(false)}
          onEnded={() => onPlayingChange(false)}
          onRateChange={(event) =>
            onRateChange(event.currentTarget.playbackRate)
          }
          onCanPlay={onReady}
          onError={onError}
        />
      )}

      {episode && isOpen && (
        <aside
          aria-label="Lydafspiller"
          className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-[#9f211e] bg-[#1d1915] text-[#f3eddf] shadow-[0_-16px_45px_rgba(29,25,21,0.28)]"
        >
          <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d7a6a2]">
                  {episode.showTitle}
                </p>
                <p className="truncate text-sm font-semibold">
                  {episode.episodeTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 cursor-pointer text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d8d0c4] underline decoration-current/40 underline-offset-4 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Luk
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onToggle}
                aria-label={isPlaying ? "Pause" : "Afspil"}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center bg-[#9f211e] text-sm transition hover:bg-[#bd2925] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
              </button>
              <button
                type="button"
                onClick={() => onSeek(-5)}
                aria-label="Fem sekunder tilbage"
                className="h-10 shrink-0 cursor-pointer border border-[#f3eddf]/35 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] transition hover:border-[#f3eddf] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                −5 s
              </button>
              <button
                type="button"
                onClick={() => onSeek(5)}
                aria-label="Fem sekunder frem"
                className="h-10 shrink-0 cursor-pointer border border-[#f3eddf]/35 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] transition hover:border-[#f3eddf] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                +5 s
              </button>
              <span className="min-w-[88px] font-mono text-[10px] text-[#d8d0c4]">
                {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => {
                  const nextTime = Number(event.target.value);
                  if (audioRef.current) audioRef.current.currentTime = nextTime;
                  onTimeChange(nextTime);
                }}
                disabled={!duration}
                aria-label="Spol i episoden"
                className="h-1 min-w-[140px] flex-1 accent-[#9f211e] disabled:opacity-40"
              />
              <label htmlFor="playback-rate" className="sr-only">
                Afspilningshastighed
              </label>
              <select
                id="playback-rate"
                value={playbackRate}
                onChange={(event) => {
                  const nextRate = Number(event.target.value);
                  if (audioRef.current) audioRef.current.playbackRate = nextRate;
                  onRateChange(nextRate);
                }}
                className="h-10 cursor-pointer border border-[#f3eddf]/35 bg-[#1d1915] px-2 text-[10px] font-semibold text-[#f3eddf] outline-none"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <option key={rate} value={rate}>
                    {rate.toLocaleString("da-DK")}×
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="mt-2 text-[10px] text-[#f0aaa5]" role="alert">
                {error}
              </p>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
