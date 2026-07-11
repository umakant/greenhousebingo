import type { LmsEvent } from "@/lib/lms-events/types";

/** Statuses that move to archived once the event end time has passed. */
export const LMS_EVENT_AUTO_ARCHIVABLE_STATUSES = [
  "published",
  "registration_open",
  "sold_out",
  "in_progress",
  "completed",
] as const;

export type LmsEventAutoArchivableStatus = (typeof LMS_EVENT_AUTO_ARCHIVABLE_STATUSES)[number];

function endOfCalendarDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** When the event is considered finished for archive purposes. */
export function getEventArchiveAt(event: Pick<LmsEvent, "startsAt" | "endsAt">): Date {
  if (event.endsAt) {
    const end = new Date(event.endsAt);
    if (!Number.isNaN(end.getTime())) return end;
  }
  return endOfCalendarDay(new Date(event.startsAt));
}

export function isEventPast(event: Pick<LmsEvent, "startsAt" | "endsAt">, now: Date = new Date()): boolean {
  return getEventArchiveAt(event).getTime() < now.getTime();
}

export function shouldAutoArchiveEvent(event: Pick<LmsEvent, "status" | "startsAt" | "endsAt">): boolean {
  if (event.status === "archived" || event.status === "cancelled" || event.status === "draft") {
    return false;
  }
  if (!LMS_EVENT_AUTO_ARCHIVABLE_STATUSES.includes(event.status as LmsEventAutoArchivableStatus)) {
    return false;
  }
  return isEventPast(event);
}

export function isActiveAdminListEvent(event: Pick<LmsEvent, "status" | "startsAt" | "endsAt">): boolean {
  if (event.status === "archived" || event.status === "cancelled") return false;
  return !isEventPast(event);
}
