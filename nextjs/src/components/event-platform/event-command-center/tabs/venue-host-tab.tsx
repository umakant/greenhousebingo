"use client";

import { useActiveTabMount } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventVenueHostTab } from "@/components/event-platform/event-command-center/venue-host/event-venue-host-tab";

type VenueHostTabProps = {
  activeTab: EventCommandTabId;
  eventId: string;
};

export function VenueHostTab(props: VenueHostTabProps) {
  const mounted = useActiveTabMount(props.activeTab, "venue-host");
  if (!mounted) return null;
  return <EventVenueHostTab eventId={props.eventId} />;
}
