import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { VenuesPageContent } from "@/components/greenhouse-bingo/venues-page";

export const metadata: Metadata = {
  title: "Host at Your Venue — Greenhouse Bingo",
  description:
    "Bring 60–130 new guests to your brewery, cidery, greenhouse or nursery by hosting a plant bingo night.",
};

export default function VenuesPage() {
  return (
    <GhBingoShell>
      <VenuesPageContent />
    </GhBingoShell>
  );
}
