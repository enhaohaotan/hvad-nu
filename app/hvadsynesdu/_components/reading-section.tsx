import { TranscriptView } from "@/app/hvadsagdede/_components/transcript-view";
import type { GeneratedContent } from "../types";

type ReadingSectionProps = {
  apiKey: string;
  reading: GeneratedContent["reading"];
  isCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
};

export function ReadingSection({ apiKey, reading, isCopied, onCopy, onDownload }: ReadingSectionProps) {
  return (
    <>
      <TranscriptView
        episodeTitle={reading.title}
        transcript={reading.paragraphs.join("\n\n")}
        timedSentences={[]}
        currentTime={0}
        isPlayerOpen={false}
        apiKey={apiKey}
        phase="done"
        isCopied={isCopied}
        variant="discussion"
        eyebrow="01 · Dagens læsning"
        metadata={[reading.category, `${reading.estimatedMinutes} min. læsning`, reading.levelLabel]}
        footerNote={null}
        onCopy={onCopy}
        onDownload={onDownload}
      />
      {reading.source && (
        <p className="mx-auto mt-4 max-w-[880px] text-[11px] leading-5 text-[#687a74]">
          Kilde: <a href={reading.source.url} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4 hover:text-[#0b4a47]">{reading.source.publisher} — {reading.source.title}</a>
          {` · ${reading.source.publishedAt}. ${reading.source.adaptationNote}`}
        </p>
      )}
    </>
  );
}
