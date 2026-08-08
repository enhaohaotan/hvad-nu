import type { Metadata } from "next";
import { HvadSagdeDe } from "./hvad-sagde-de";

export const metadata: Metadata = {
  title: "Hva’ sagde de?",
  description:
    "Gør enhver DR LYD-podcastepisode til en tydelig dansk transskription — klar til at læse med, mens du lytter.",
  alternates: {
    canonical: "/hvadsagdede",
  },
  openGraph: {
    title: "Hva’ sagde de?",
    description: "Fra dansk lyd til læsevenlige ord.",
    url: "/hvadsagdede",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hva’ sagde de?",
    description: "Fra dansk lyd til læsevenlige ord.",
  },
};

export default function HvadSagdeDePage() {
  return <HvadSagdeDe />;
}
