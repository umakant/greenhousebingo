"use client";

import { useActiveTabMount } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventFinancialsTab } from "@/components/event-platform/event-command-center/financials/event-financials-tab";

type FinancialsTabProps = {
  activeTab: EventCommandTabId;
  eventId: string;
};

export function FinancialsTab(props: FinancialsTabProps) {
  const mounted = useActiveTabMount(props.activeTab, "financials");
  if (!mounted) return null;
  return <EventFinancialsTab eventId={props.eventId} />;
}
