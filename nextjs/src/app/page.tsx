import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { GreenhouseBingoHome } from "@/components/greenhouse-bingo/greenhouse-bingo-home";

export const metadata: Metadata = {
  title: "Greenhouse Bingo — Find Plant Bingo Events Near You",
  description:
    "Discover plant bingo events, buy tickets, or start your own local Greenhouse Bingo platform. Everyone's a winner.",
  openGraph: {
    title: "Greenhouse Bingo",
    description:
      "Find plant bingo events near you or launch your own local rep platform.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <GhBingoShell>
      <GreenhouseBingoHome />
    </GhBingoShell>
  );
}
