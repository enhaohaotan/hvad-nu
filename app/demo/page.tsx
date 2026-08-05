import type { Metadata } from "next";
import { DemoPage } from "./demo-page";

export const metadata: Metadata = {
  title: "Demo — Hva’ sagde de?",
  description:
    "Prøv hele transskriptionsforløbet uden en OpenAI API-nøgle eller betaling.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <DemoPage />;
}
