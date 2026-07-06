import type { Metadata } from "next";
import { Suspense } from "react";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { EventsPageContent } from "@/components/greenhouse-bingo/events-page";

export const metadata: Metadata = {
  title: "All Plant Bingo Events — Greenhouse Bingo",
  description:
    "Browse every upcoming plant bingo event from every rep, venue, and company.",
};

export default function EventsPage() {
  return (
    <GhBingoShell>
      <Suspense>
        <EventsPageContent />
      </Suspense>
    </GhBingoShell>
  );
}
