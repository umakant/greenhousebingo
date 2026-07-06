/**
 * Minimal iCalendar (RFC 5545) generation for storefront event exports.
 * Uses floating local date-times (no trailing Z) so values line up with how
 * {@link mapStorefrontEventDtoToEventItem} interprets DB timestamps in the browser.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYYMMDDTHHmmss` in the user's local timezone. */
function formatFloatingLocal(dt: Date): string {
  return (
    `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}` +
    `T${pad2(dt.getHours())}${pad2(dt.getMinutes())}${pad2(dt.getSeconds())}`
  );
}

function formatDateOnlyLocal(dt: Date): string {
  return `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}`;
}

/** Escape TEXT value per RFC 5545. */
export function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function hasLocalClockTime(d: Date): boolean {
  return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
}

function isAllDayRange(start: Date, end: Date | null): boolean {
  if (hasLocalClockTime(start)) return false;
  if (!end) return true;
  return !hasLocalClockTime(end);
}

function addOneHourLocal(d: Date): Date {
  return new Date(d.getTime() + 60 * 60 * 1000);
}

function addOneDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  return x;
}

function icsUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export type BuildStorefrontEventIcsInput = {
  id: string;
  title: string;
  description?: string;
  /** Venue / place name */
  venue?: string;
  /** Full address line */
  address?: string;
  eventDateIso: string | null;
  endDateIso: string | null;
};

/**
 * Returns VCALENDAR body or `null` when there is no start instant to anchor the event.
 */
export function buildStorefrontEventIcsContent(input: BuildStorefrontEventIcsInput): string | null {
  if (!input.eventDateIso?.trim()) return null;
  const start = new Date(input.eventDateIso);
  if (Number.isNaN(start.getTime())) return null;

  const endRaw = input.endDateIso?.trim() ? new Date(input.endDateIso) : null;
  const end = endRaw && !Number.isNaN(endRaw.getTime()) ? endRaw : null;

  const summary = escapeIcsText(input.title.trim() || "Event");
  const desc = escapeIcsText((input.description ?? "").trim());
  const locParts = [input.venue, input.address].map((s) => (s ?? "").trim()).filter(Boolean);
  const location = escapeIcsText(locParts.join(", "));

  let dtLines: string;
  if (isAllDayRange(start, end)) {
    const ds = formatDateOnlyLocal(start);
    const endInclusive =
      end && !hasLocalClockTime(end) && end.getTime() >= start.getTime() ? end : start;
    const de = formatDateOnlyLocal(addOneDayLocal(endInclusive));
    dtLines = `DTSTART;VALUE=DATE:${ds}\r\nDTEND;VALUE=DATE:${de}\r\n`;
  } else {
    let dtEnd = end;
    if (!dtEnd || dtEnd.getTime() <= start.getTime()) {
      dtEnd = addOneHourLocal(start);
    }
    dtLines = `DTSTART:${formatFloatingLocal(start)}\r\nDTEND:${formatFloatingLocal(dtEnd)}\r\n`;
  }

  const uid = `storefront-event-${input.id}@paperflight`;
  const dtStamp = icsUtcStamp(new Date());

  return (
    "BEGIN:VCALENDAR\r\n" +
    "VERSION:2.0\r\n" +
    "PRODID:-//Paper Flight//Storefront Events//EN\r\n" +
    "CALSCALE:GREGORIAN\r\n" +
    "METHOD:PUBLISH\r\n" +
    "BEGIN:VEVENT\r\n" +
    `UID:${uid}\r\n` +
    `DTSTAMP:${dtStamp}\r\n` +
    dtLines +
    `SUMMARY:${summary}\r\n` +
    (desc ? `DESCRIPTION:${desc}\r\n` : "") +
    (location ? `LOCATION:${location}\r\n` : "") +
    "END:VEVENT\r\n" +
    "END:VCALENDAR\r\n"
  );
}

export function downloadIcsFile(filename: string, body: string): void {
  const safeName = filename.replace(/[^\w\-+.]+/g, "_").slice(0, 120) || "event.ics";
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName.endsWith(".ics") ? safeName : `${safeName}.ics`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
