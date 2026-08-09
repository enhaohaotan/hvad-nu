import type { Metadata } from "next";
import demoContent from "@/public/demo/migrantkaos-i-ceuta.json";
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
  return <DemoPage content={demoContent} />;
}
