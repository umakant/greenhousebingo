import { format } from "date-fns";

/**
 * Gantt / Prisma @db.Date values are calendar dates. The API often sends ISO strings
 * (UTC midnight), which shift when interpreted as instants in local time.
 * This parses the date part only and builds a local midnight for that calendar day.
 */
export function parseGanttCalendarDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const trimmed = String(s).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo, d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatGanttInputDate(s: string | Date | null | undefined): string {
  if (s instanceof Date) {
    if (isNaN(s.getTime())) return "";
    const y = s.getUTCFullYear();
    const mo = String(s.getUTCMonth() + 1).padStart(2, "0");
    const d = String(s.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  const d = parseGanttCalendarDate(s);
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

/** First valid calendar date from a list (treats blank strings as missing). */
export function coalesceGanttDate(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    const normalized = formatGanttInputDate(value);
    if (normalized) return normalized;
  }
  return null;
}

export function formatGanttDisplayDate(s: string | null | undefined, pattern: string): string {
  const d = parseGanttCalendarDate(s);
  if (!d) return (s ?? "").trim();
  return format(d, pattern);
}

/**
 * Persist HTML date input (YYYY-MM-DD) as a Prisma @db.Date without TZ drift.
 */
export function prismaDateFromDateOnlyInput(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s).trim());
  if (!m) return new Date(s);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0));
}
