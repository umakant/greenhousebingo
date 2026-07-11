"use client";

import { useActiveTabMount } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { EventMarketingTab } from "@/components/event-platform/event-command-center/marketing/event-marketing-tab";

type MarketingTabProps = {
  activeTab: EventCommandTabId;
  eventId: string;
};

export function MarketingTab(props: MarketingTabProps) {
  const mounted = useActiveTabMount(props.activeTab, "marketing");
  if (!mounted) return null;
  return <EventMarketingTab eventId={props.eventId} />;
}
