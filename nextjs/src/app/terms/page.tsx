import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { GhTermsContent } from "@/components/greenhouse-bingo/gh-terms-content";

export const metadata: Metadata = {
  title: "Terms of Service — Greenhouse Bingo",
  description:
    "The Terms of Service governing your access to and use of the Greenhouse Bingo Platform, Software, Website, and Services.",
};

export default function TermsPage() {
  return (
    <GhBingoShell>
      <GhTermsContent />
    </GhBingoShell>
  );
}
