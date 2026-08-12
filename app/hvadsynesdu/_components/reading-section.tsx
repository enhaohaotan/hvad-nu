import { TranscriptView } from "@/app/hvadsagdede/_components/transcript-view";
import { DAILY_READING } from "../daily-content";

const READING_TEXT = DAILY_READING.paragraphs.join("\n\n");

type ReadingSectionProps = {
  apiKey: string;
  isCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
};

export function ReadingSection({
  apiKey,
  isCopied,
  onCopy,
  onDownload,
}: ReadingSectionProps) {
  return (
    <TranscriptView
      episodeTitle={DAILY_READING.title}
      transcript={READING_TEXT}
      timedSentences={[]}
      currentTime={0}
      isPlayerOpen={false}
      apiKey={apiKey}
      phase="done"
      isCopied={isCopied}
      variant="discussion"
      eyebrow="Dagens læsning"
      footerNote="AI-oversættelser kan indeholde fejl. Sammenlign med den danske tekst, hvis noget virker forkert."
      onCopy={onCopy}
      onDownload={onDownload}
    />
  );
}
