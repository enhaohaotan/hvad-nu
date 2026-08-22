import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://havdsagdede.tanenhao.com"),
  title: "Hva’ sagde de?",
  description: "Gør enhver DR LYD-podcastepisode til en tydelig dansk transskription — klar til at læse med, mens du lytter.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Hva’ sagde de?",
    description: "Fra dansk lyd til læsevenlige ord.",
    url: "/",
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
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
