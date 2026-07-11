"use client";

import { useActiveTabMount } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventOperationsTab } from "@/components/event-platform/event-command-center/operations/event-operations-tab";

type ActivityTabProps = {
  activeTab: EventCommandTabId;
  eventId: string;
};

export function ActivityTab(props: ActivityTabProps) {
  const mounted = useActiveTabMount(props.activeTab, "activity");
  if (!mounted) return null;
  return <EventOperationsTab eventId={props.eventId} />;
}
