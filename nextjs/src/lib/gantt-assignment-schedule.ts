import { eachDayOfInterval, format } from "date-fns";

import { parseGanttCalendarDate, formatGanttInputDate } from "@/lib/gantt-dates";

export const SCHEDULE_LABEL_PREFIX = "__schedule__:";

export type GanttDayScheduleEntry = {
  date: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export function parseAssignmentSchedule(label: string | null | undefined): GanttDayScheduleEntry[] | null {
  if (!label?.startsWith(SCHEDULE_LABEL_PREFIX)) return null;
  try {
    const parsed = JSON.parse(label.slice(SCHEDULE_LABEL_PREFIX.length)) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (row): row is GanttDayScheduleEntry =>
          !!row &&
          typeof row === "object" &&
          typeof (row as GanttDayScheduleEntry).date === "string" &&
          typeof (row as GanttDayScheduleEntry).startTime === "string" &&
          typeof (row as GanttDayScheduleEntry).endTime === "string",
      )
      .map((row) => ({
        date: row.date,
        enabled: row.enabled !== false,
        startTime: row.startTime,
        endTime: row.endTime,
      }));
  } catch {
    return null;
  }
}

export function serializeAssignmentSchedule(entries: GanttDayScheduleEntry[]): string {
  return `${SCHEDULE_LABEL_PREFIX}${JSON.stringify(entries)}`;
}

export function buildDaySchedule(
  startDate: string,
  endDate: string,
  existing: GanttDayScheduleEntry[] = [],
  defaultStart = "07:00",
  defaultEnd = "17:00",
): GanttDayScheduleEntry[] {
  const start = parseGanttCalendarDate(startDate);
  const end = parseGanttCalendarDate(endDate);
  if (!start || !end || start > end) return [];

  const byDate = new Map(existing.map((row) => [row.date, row]));
  return eachDayOfInterval({ start, end }).map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const prev = byDate.get(date);
    return (
      prev ?? {
        date,
        enabled: true,
        startTime: defaultStart,
        endTime: defaultEnd,
      }
    );
  });
}

export function dayOfWeekColor(dateStr: string): string {
  const d = parseGanttCalendarDate(dateStr);
  if (!d) return "#64748B";
  const colors = ["#84CC16", "#EC4899", "#EF4444", "#F97316", "#22C55E", "#3B82F6", "#EAB308"];
  return colors[d.getDay()] ?? "#64748B";
}

export function dayOfWeekLetter(dateStr: string): string {
  const d = parseGanttCalendarDate(dateStr);
  if (!d) return "?";
  return format(d, "EEEEE");
}

/** Hours label for a day schedule row, e.g. "11h" or "7h 30m". */
export function scheduleDayDurationLabel(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "—";
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Resolved per-day schedule for staff Gantt blocks. */
export function resolveStaffAssignmentSchedule(
  label: string | null | undefined,
  startDate: string | null,
  endDate: string | null,
): { byDate: Map<string, GanttDayScheduleEntry>; explicit: boolean } {
  const parsed = parseAssignmentSchedule(label);
  if (parsed) {
    return { byDate: new Map(parsed.map((row) => [row.date, row])), explicit: true };
  }

  const start = formatGanttInputDate(startDate);
  const end = formatGanttInputDate(endDate);
  if (start && end) {
    return {
      byDate: new Map(buildDaySchedule(start, end).map((row) => [row.date, row])),
      explicit: false,
    };
  }
  return { byDate: new Map(), explicit: false };
}

export function isStaffScheduleDayConfirmed(
  dateKey: string,
  inRange: boolean,
  schedule: Map<string, GanttDayScheduleEntry>,
  explicitSchedule: boolean,
): boolean {
  if (!inRange) return false;
  const entry = schedule.get(dateKey);
  if (explicitSchedule) return Boolean(entry?.enabled);
  return entry ? entry.enabled !== false : true;
}
