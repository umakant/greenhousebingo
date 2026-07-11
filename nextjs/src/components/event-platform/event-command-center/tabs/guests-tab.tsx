"use client";

import { useActiveTabMount } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventAttendeesTab } from "@/components/event-platform/event-command-center/attendees/event-attendees-tab";

type GuestsTabProps = {
  eventId: string;
  activeTab: EventCommandTabId;
};

export function GuestsTab(props: GuestsTabProps) {
  const mounted = useActiveTabMount(props.activeTab, "guests");
  if (!mounted) return null;
  return <EventAttendeesTab eventId={props.eventId} variant="guests" />;
}
