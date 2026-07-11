import type { LmsEvent, LmsEventAttendee, LmsEventCategory, LmsEventTicket } from "@/lib/lms-events/types";

export const EVENT_COMMAND_TABS = [
  { id: "overview", label: "Overview" },
  { id: "attendees", label: "Attendees" },
  { id: "guests", label: "Guests" },
  { id: "games", label: "Games & Winners" },
  { id: "plants", label: "Plants" },
  { id: "financials", label: "Financials" },
  { id: "venue-host", label: "Venue & Host" },
  { id: "marketing", label: "Marketing" },
  { id: "activity", label: "Activity" },
] as const;

export type EventCommandTabId = (typeof EVENT_COMMAND_TABS)[number]["id"];

export const DEFAULT_EVENT_COMMAND_TAB: EventCommandTabId = "overview";

export function parseEventCommandTab(value: string | null | undefined): EventCommandTabId {
  const found = EVENT_COMMAND_TABS.find((t) => t.id === value);
  return found?.id ?? DEFAULT_EVENT_COMMAND_TAB;
}

export type EventCommandCenterSnapshot = {
  event: LmsEvent;
  tickets: LmsEventTicket[];
  attendees: LmsEventAttendee[];
  categories: LmsEventCategory[];
};

export type EventCommandTabCounts = Partial<Record<EventCommandTabId, number>>;
