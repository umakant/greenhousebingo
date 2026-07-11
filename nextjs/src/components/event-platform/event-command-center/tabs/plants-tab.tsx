"use client";

import { useActiveTabMount } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventPlantsTab } from "@/components/event-platform/event-command-center/plants/event-plants-tab";

type PlantsTabProps = {
  activeTab: EventCommandTabId;
  eventId: string;
};

export function PlantsTab(props: PlantsTabProps) {
  const mounted = useActiveTabMount(props.activeTab, "plants");
  if (!mounted) return null;
  return <EventPlantsTab eventId={props.eventId} />;
}
