"use client";

import type { LmsEventCardModel } from "@/lib/lms-events/types";

import { EventCard } from "@/components/lms/events/event-card";
import { EventEmptyState } from "@/components/lms/events/event-empty-state";
import { cn } from "@/lib/utils";

export function EventList(props: {
  events: LmsEventCardModel[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  columns?: "2" | "3";
}) {
  const { events, emptyTitle, emptyDescription, className, columns = "3" } = props;

  if (events.length === 0) {
    return <EventEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        columns === "2" ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
