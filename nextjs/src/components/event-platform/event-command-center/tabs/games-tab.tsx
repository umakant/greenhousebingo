"use client";

import { useActiveTabMount } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventGamesTab } from "@/components/event-platform/event-command-center/games/event-games-tab";

type GamesTabProps = {
  activeTab: EventCommandTabId;
  eventId: string;
};

export function GamesTab(props: GamesTabProps) {
  const mounted = useActiveTabMount(props.activeTab, "games");
  if (!mounted) return null;
  return <EventGamesTab eventId={props.eventId} />;
}
