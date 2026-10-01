import type { TranslationLanguage } from "./translation.ts";
import { formatEpisodeMeta } from "./episode-format.ts";

export type TranscriptTranslation = {
  language: TranslationLanguage;
  text: string;
};

export function downloadTranscriptMarkdown({
  showTitle,
  title,
  publishedAt,
  duration,
  description,
  transcript,
  translation,
}: {
  showTitle?: string;
  title?: string;
  publishedAt?: string;
  duration?: string;
  description?: string;
  transcript: string;
  translation?: TranscriptTranslation;
}) {
  if (!transcript.trim()) return;
  const heading = title?.trim() || "Transskription";
  const metadata = formatEpisodeMeta({ publishedAt, duration });
  const sections = [
    `# ${escapeHeading(showTitle?.trim() || "Podcast")}${metadata ? ` **${escapeHeading(metadata)}**` : ""}`,
    `## ${escapeHeading(heading)}`,
  ];
  if (description?.trim()) sections.push(description.trim());
  sections.push("---", transcript.trim());
  if (translation?.text.trim()) {
    sections.push("---", translation.text.trim());
  }

  const safeTitle = heading
    .toLocaleLowerCase("da")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "") || "transskription";
  const href = URL.createObjectURL(
    new Blob([`${sections.join("\n\n")}\n`], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = href;
  link.download = `${safeTitle}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Let the browser start the download before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function escapeHeading(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/[\\`*_[\]<>#]/g, "\\$&");
}
