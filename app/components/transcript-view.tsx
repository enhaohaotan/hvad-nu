import type { TranscriptionPhase } from "@/lib/transcription-client";

export function TranscriptView({
  episodeTitle,
  transcript,
  phase,
  isCopied,
  onCopy,
  onDownload,
}: {
  episodeTitle?: string;
  transcript: string;
  phase: TranscriptionPhase;
  isCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <section
      className="mt-12 border-t-4 border-[#76866f] pt-7 sm:mt-16 sm:pt-9"
      aria-labelledby="transcript-title"
    >
      <div className="grid gap-6 border-b border-[#29231b]/40 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9f211e]">
            Transskriptionen
          </p>
          <h2
            id="transcript-title"
            className="editorial-serif mt-2 max-w-[900px] text-3xl leading-none tracking-[-0.035em] sm:text-5xl"
          >
            {episodeTitle}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopy}
            aria-live="polite"
            className="w-fit border border-[#29231b] bg-[#29231b] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f8f2e6] transition hover:border-[#9f211e] hover:bg-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            {isCopied ? "Kopieret" : "Kopiér tekst"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="w-fit border border-[#29231b] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:bg-[#29231b] hover:text-[#f8f2e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            Hent tekst
          </button>
        </div>
      </div>
      <article
        aria-live="polite"
        className="editorial-copy mx-auto max-w-[880px] whitespace-pre-wrap py-9 text-[15px] leading-[1.8] text-[#332e27] sm:py-12 sm:text-[16px]"
      >
        {transcript}
        {phase === "transcribing" && (
          <span
            className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-[#9f211e] align-middle"
            aria-hidden="true"
          />
        )}
      </article>
      {phase === "done" && (
        <p className="mx-auto max-w-[880px] border-t border-[#29231b]/20 pb-2 pt-3 text-[10px] leading-5 text-[#70695f]">
          AI kan tage fejl. Sammenlign med lydsporet, hvis noget virker forkert.
        </p>
      )}
    </section>
  );
}
