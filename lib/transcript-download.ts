import { TRANSLATION_LANGUAGES, type TranslationLanguage } from "./translation.ts";

export type TranscriptTranslation = {
  language: TranslationLanguage;
  text: string;
};

export function downloadTranscriptMarkdown({
  showTitle,
  title,
  description,
  transcript,
  translation,
}: {
  showTitle?: string;
  title?: string;
  description?: string;
  transcript: string;
  translation?: TranscriptTranslation;
}) {
  if (!transcript.trim()) return;
  const heading = title?.trim() || "Transskription";
  const sections = [
    `# ${heading.replace(/[\r\n]+/g, " ").replace(/[\\`*_[\]<>#]/g, "\\$&")}`,
  ];
  if (showTitle?.trim()) {
    const podcastName = showTitle.trim().replace(/[\r\n]+/g, " ").replace(/[\\`*_[\]<>#]/g, "\\$&");
    sections.push(`**Podcast:** ${podcastName}`);
  }
  if (description?.trim()) sections.push(`## Beskrivelse\n\n${description.trim()}`);
  sections.push(`## Transskription\n\n${transcript.trim()}`);
  if (translation?.text.trim()) {
    sections.push(`## Oversættelse (${TRANSLATION_LANGUAGES[translation.language]})\n\n${translation.text.trim()}`);
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
