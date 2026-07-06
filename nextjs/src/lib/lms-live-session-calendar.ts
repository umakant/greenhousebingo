/**
 * Calendar export helpers for LMS live sessions (ICS + Google Calendar URL).
 * Safe to import from client components.
 */

import { escapeIcsText } from "@/lib/event-calendar-ics";

export type LiveSessionCalendarInput = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  meetingUrl?: string | null;
  courseTitle?: string | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatFloatingLocal(dt: Date): string {
  return (
    `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}` +
    `T${pad2(dt.getHours())}${pad2(dt.getMinutes())}${pad2(dt.getSeconds())}`
  );
}

function icsUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildDescription(input: LiveSessionCalendarInput): string {
  const parts: string[] = [];
  if (input.courseTitle?.trim()) parts.push(`Course: ${input.courseTitle.trim()}`);
  if (input.description?.trim()) parts.push(input.description.trim());
  if (input.meetingUrl?.trim()) parts.push(`Join: ${input.meetingUrl.trim()}`);
  return parts.join("\n\n");
}

/** RFC 5545 VCALENDAR for a live session. */
export function buildLiveSessionIcsContent(input: LiveSessionCalendarInput): string | null {
  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const dtEnd = end.getTime() > start.getTime() ? end : new Date(start.getTime() + 60 * 60 * 1000);
  const summary = escapeIcsText(input.title.trim() || "Live class");
  const desc = escapeIcsText(buildDescription(input));
  const uid = `lms-live-session-${input.id}@paperflight`;
  const dtStamp = icsUtcStamp(new Date());

  return (
    "BEGIN:VCALENDAR\r\n" +
    "VERSION:2.0\r\n" +
    "PRODID:-//Paper Flight//LMS Live Sessions//EN\r\n" +
    "CALSCALE:GREGORIAN\r\n" +
    "METHOD:PUBLISH\r\n" +
    "BEGIN:VEVENT\r\n" +
    `UID:${uid}\r\n` +
    `DTSTAMP:${dtStamp}\r\n` +
    `DTSTART:${formatFloatingLocal(start)}\r\n` +
    `DTEND:${formatFloatingLocal(dtEnd)}\r\n` +
    `SUMMARY:${summary}\r\n` +
    (desc ? `DESCRIPTION:${desc}\r\n` : "") +
    "END:VEVENT\r\n" +
    "END:VCALENDAR\r\n"
  );
}

/** Google Calendar “create event” URL (no OAuth). Dates in UTC compact form. */
export function buildGoogleCalendarAddUrl(input: LiveSessionCalendarInput): string | null {
  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const dtEnd = end.getTime() > start.getTime() ? end : new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title.trim() || "Live class",
    dates: `${fmt(start)}/${fmt(dtEnd)}`,
    details: buildDescription(input),
  });
  if (input.meetingUrl?.trim()) {
    params.set("location", input.meetingUrl.trim());
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
