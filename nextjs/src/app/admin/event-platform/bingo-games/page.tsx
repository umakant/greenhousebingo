import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformBingoGamesAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-bingo-games-admin").then((m) => m.EventPlatformBingoGamesAdmin),
);

export default async function EventPlatformBingoGamesPage() {
  return (
    <EventPlatformPage permission="bingoGames.view" path="/admin/event-platform/bingo-games" title="Bingo Games" hidePageTitle>
      <EventPlatformBingoGamesAdmin />
    </EventPlatformPage>
  );
}
