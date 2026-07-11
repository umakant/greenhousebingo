"use client";

import { useActiveTabMount } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventAttendeesTab } from "@/components/event-platform/event-command-center/attendees/event-attendees-tab";

type AttendeesTabProps = {
  eventId: string;
  activeTab: EventCommandTabId;
};

export function AttendeesTab(props: AttendeesTabProps) {
  const mounted = useActiveTabMount(props.activeTab, "attendees");
  if (!mounted) return null;
  return <EventAttendeesTab eventId={props.eventId} />;
}
