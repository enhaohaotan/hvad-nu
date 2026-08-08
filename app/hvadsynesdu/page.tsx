import type { Metadata } from "next";
import { HvadSynesDu } from "./hvad-synes-du";

export const metadata: Metadata = {
  title: "Hva’ synes du? — Dansk, du kan bruge",
  description:
    "Læs, tænk og diskutér på dansk — med personlig feedback og vendinger, der vender tilbage.",
  alternates: {
    canonical: "/hvadsynesdu",
  },
  openGraph: {
    title: "Hva’ synes du?",
    description: "Fra det, du forstår, til det, du selv kan sige.",
    url: "/hvadsynesdu",
    type: "website",
    images: [
      {
        url: "/hvadsynesdu-og.png",
        width: 1731,
        height: 909,
        alt: "Hva’ synes du? — Dansk, du kan bruge",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hva’ synes du?",
    description: "Fra det, du forstår, til det, du selv kan sige.",
    images: ["/hvadsynesdu-og.png"],
  },
};

export default function HvadSynesDuPage() {
  return <HvadSynesDu />;
}
