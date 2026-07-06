import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { CompaniesPageContent } from "@/components/greenhouse-bingo/companies-page";

export const metadata: Metadata = {
  title: "Companies & Reps — Greenhouse Bingo",
  description: "Every approved Greenhouse Bingo rep and company across the country.",
};

export default function CompaniesPage() {
  return (
    <GhBingoShell>
      <CompaniesPageContent />
    </GhBingoShell>
  );
}
