"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { DrEpisode } from "@/lib/dr";
import { formatPlaybackTime } from "@/lib/episode-format";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

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
  onSeekComplete,
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
  onSeekComplete?: (value: number) => void;
  onPlayingChange: (value: boolean) => void;
  onRateChange: (value: number) => void;
  onReady: () => void;
  onError: () => void;
  onClose: () => void;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
}) {
  const [isRateMenuOpen, setIsRateMenuOpen] = useState(false);
  const ratePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isInteractiveTarget(event.target)) return;

      if (event.code === "Space") {
        event.preventDefault();
        onToggle();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onSeek(-5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onSeek(5);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onSeek, onToggle]);

  useEffect(() => {
    if (!isRateMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!ratePickerRef.current?.contains(event.target as Node)) {
        setIsRateMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsRateMenuOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isRateMenuOpen]);

  function selectRate(rate: number) {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    onRateChange(rate);
    setIsRateMenuOpen(false);
  }

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
          onSeeked={(event) =>
            onSeekComplete?.(event.currentTarget.currentTime)
          }
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
                onClick={() => {
                  setIsRateMenuOpen(false);
                  onClose();
                }}
                className="shrink-0 cursor-pointer text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d8d0c4] underline decoration-current/40 underline-offset-4 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Luk
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={(event) => {
                  if (event.detail > 0) event.currentTarget.blur();
                  onToggle();
                }}
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
              <div ref={ratePickerRef} className="relative">
                <button
                  type="button"
                  aria-label={`Afspilningshastighed: ${formatRate(playbackRate)}`}
                  aria-haspopup="menu"
                  aria-expanded={isRateMenuOpen}
                  onClick={() => setIsRateMenuOpen((open) => !open)}
                  className="flex h-10 min-w-[70px] items-center justify-between gap-2 border border-[#f3eddf]/35 bg-[#29231f] px-3 text-[10px] font-semibold text-[#f3eddf] transition hover:border-[#f3eddf] hover:bg-[#36302a] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <span>{formatRate(playbackRate)}</span>
                  <span
                    aria-hidden="true"
                    className={`text-[8px] transition-transform ${isRateMenuOpen ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </button>
                {isRateMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Afspilningshastighed"
                    className="absolute bottom-[calc(100%+8px)] right-0 z-10 min-w-[96px] border border-[#f3eddf]/30 bg-[#29231f] p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                  >
                    {PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        role="menuitemradio"
                        aria-checked={playbackRate === rate}
                        onClick={() => selectRate(rate)}
                        className={`flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 ${
                          playbackRate === rate
                            ? "bg-[#9f211e] text-white"
                            : "text-[#f3eddf] hover:bg-white/10"
                        }`}
                      >
                        <span>{formatRate(rate)}</span>
                        {playbackRate === rate && (
                          <span aria-hidden="true">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

function formatRate(rate: number): string {
  return `${rate.toLocaleString("da-DK")}×`;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "button, [role='button'], a, input, select, textarea, summary, [contenteditable='true']",
      ),
    )
  );
}
