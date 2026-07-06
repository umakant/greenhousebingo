import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { AboutPageContent } from "@/components/greenhouse-bingo/about-page";

export const metadata: Metadata = {
  title: "About — Greenhouse Bingo",
  description:
    "Greenhouse Bingo is the national platform for plant bingo events. Everyone's a winner.",
};

export default function AboutPage() {
  return (
    <GhBingoShell>
      <AboutPageContent />
    </GhBingoShell>
  );
}
