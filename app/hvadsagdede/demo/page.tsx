import type { Metadata } from "next";
import demoContent from "@/public/demo/tate-broedre-buret-inde.json";
import { DemoPage } from "./demo-page";

export const metadata: Metadata = {
  title: "Demo — Hva’ sagde de?",
  description:
    "Læs en færdig dansk transskription med engelsk oversættelse.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return (
    <DemoPage
      episodeTitle={demoContent.episodeTitle}
      transcript={demoContent.transcript}
      timedSentences={demoContent.timedSentences}
      englishTranslations={demoContent.translations.en}
    />
  );
}
