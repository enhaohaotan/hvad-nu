import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hva’ sagde de?",
  description: "Gør enhver DR LYD-podcastepisode til en tydelig dansk transskription — klar til at læse med, mens du lytter.",
  openGraph: {
    title: "Hva’ sagde de?",
    description: "Fra dansk lyd til læsevenlige ord.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hva’ sagde de?",
    description: "Fra dansk lyd til læsevenlige ord.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
