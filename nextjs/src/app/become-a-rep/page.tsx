import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { StartBusinessContent } from "@/components/greenhouse-bingo/start-business-content";

export const metadata: Metadata = {
  title: "Start Your Own Plant Bingo Business — Greenhouse Bingo",
  description:
    "Launch your own branded Plant Bingo website, sell tickets online, collect payments instantly, and manage every aspect of your business from one powerful dashboard.",
};

export default function BecomeARepPage() {
  return (
    <GhBingoShell>
      <StartBusinessContent />
    </GhBingoShell>
  );
}
