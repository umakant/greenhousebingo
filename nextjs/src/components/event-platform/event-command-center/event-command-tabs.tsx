"use client";

import * as React from "react";

import {
  EVENT_COMMAND_TABS,
  type EventCommandTabId,
} from "@/components/event-platform/event-command-center/event-command-center-types";
import { useEventCommandCenter } from "@/components/event-platform/event-command-center/event-command-center-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EventCommandTabsProps = {
  activeTab: EventCommandTabId;
  onTabChange: (tab: EventCommandTabId) => void;
};

export function EventCommandTabs(props: EventCommandTabsProps) {
  const { tabCounts } = useEventCommandCenter();

  return (
    <div className="sticky top-0 z-20 -mx-1 border-b bg-background/95 px-1 pb-0 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div
        className="flex gap-1 overflow-x-auto pb-px scrollbar-thin"
        role="tablist"
        aria-label="Event command center sections"
      >
        {EVENT_COMMAND_TABS.map((tab) => {
          const count = tabCounts[tab.id];
          const active = props.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => props.onTabChange(tab.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              {count != null && count > 0 ? (
                <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                  {count}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
