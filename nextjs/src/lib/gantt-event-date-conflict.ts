import { format, startOfDay } from "date-fns";

import {
  parseAssignmentSchedule,
  type GanttDayScheduleEntry,
} from "@/lib/gantt-assignment-schedule";
import { formatGanttInputDate, parseGanttCalendarDate } from "@/lib/gantt-dates";

export type GanttEventBounds = {
  projectStart: string;
  projectEnd: string;
  locationStart: string | null;
  locationEnd: string | null;
  locationName: string | null;
};

export type GanttAssignmentSpan = {
  start: string;
  end: string;
};

export type GanttEventDateExtensionConflict = {
  exceedsEventDates: boolean;
  assignmentSpan: GanttAssignmentSpan;
  eventBounds: GanttEventBounds;
  extendsProjectEnd: boolean;
  extendsProjectStart: boolean;
  extendsLocationEnd: boolean;
  extendsLocationStart: boolean;
  proposedProjectStart: string;
  proposedProjectEnd: string;
  proposedLocationStart: string | null;
  proposedLocationEnd: string | null;
};

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Effective working span from dates + enabled schedule days. */
export function computeGanttAssignmentSpan(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  daySchedule?: GanttDayScheduleEntry[] | null,
  scheduleLabel?: string | null,
): GanttAssignmentSpan | null {
  let start = parseGanttCalendarDate(startDate ?? null);
  let end = parseGanttCalendarDate(endDate ?? null);

  const schedule =
    daySchedule ??
    (scheduleLabel ? parseAssignmentSchedule(scheduleLabel) : null) ??
    [];

  const enabledDates = schedule.filter((d) => d.enabled).map((d) => d.date).sort();
  for (const key of enabledDates) {
    const d = parseGanttCalendarDate(key);
    if (!d) continue;
    if (!start || d < start) start = d;
    if (!end || d > end) end = d;
  }

  if (!start || !end) return null;
  if (start > end) return null;
  return { start: dateKey(start), end: dateKey(end) };
}

export function resolveGanttEventBounds(input: {
  projectStartDate: string | null;
  projectEndDate: string | null;
  locationStartDate?: string | null;
  locationEndDate?: string | null;
  locationName?: string | null;
}): GanttEventBounds | null {
  const projectStart = formatGanttInputDate(input.projectStartDate);
  const projectEnd = formatGanttInputDate(input.projectEndDate);
  if (!projectStart || !projectEnd) return null;
  return {
    projectStart,
    projectEnd,
    locationStart: input.locationStartDate ? formatGanttInputDate(input.locationStartDate) : null,
    locationEnd: input.locationEndDate ? formatGanttInputDate(input.locationEndDate) : null,
    locationName: input.locationName ?? null,
  };
}

export function detectGanttEventDateExtensionConflict(input: {
  assignmentSpan: GanttAssignmentSpan | null;
  eventBounds: GanttEventBounds | null;
}): GanttEventDateExtensionConflict | null {
  const { assignmentSpan, eventBounds } = input;
  if (!assignmentSpan || !eventBounds) return null;

  const aStart = parseGanttCalendarDate(assignmentSpan.start);
  const aEnd = parseGanttCalendarDate(assignmentSpan.end);
  const pStart = parseGanttCalendarDate(eventBounds.projectStart);
  const pEnd = parseGanttCalendarDate(eventBounds.projectEnd);
  if (!aStart || !aEnd || !pStart || !pEnd) return null;

  const locStart = parseGanttCalendarDate(eventBounds.locationStart);
  const locEnd = parseGanttCalendarDate(eventBounds.locationEnd);

  const effectiveStart = locStart && locStart > pStart ? locStart : pStart;
  const effectiveEnd = locEnd && locEnd < pEnd ? locEnd : pEnd;

  const extendsProjectStart = aStart < pStart;
  const extendsProjectEnd = aEnd > pEnd;
  const extendsLocationStart = Boolean(locStart && aStart < locStart);
  const extendsLocationEnd = Boolean(locEnd && aEnd > locEnd);
  const exceedsEventDates =
    aStart < startOfDay(effectiveStart) ||
    aEnd > startOfDay(effectiveEnd);

  let proposedProjectStart = eventBounds.projectStart;
  let proposedProjectEnd = eventBounds.projectEnd;
  if (extendsProjectStart) proposedProjectStart = assignmentSpan.start;
  if (extendsProjectEnd) proposedProjectEnd = assignmentSpan.end;

  let proposedLocationStart = eventBounds.locationStart;
  let proposedLocationEnd = eventBounds.locationEnd;
  if (eventBounds.locationStart || eventBounds.locationEnd) {
    if (extendsLocationStart) proposedLocationStart = assignmentSpan.start;
    if (extendsLocationEnd) proposedLocationEnd = assignmentSpan.end;
  }

  return {
    exceedsEventDates,
    assignmentSpan,
    eventBounds,
    extendsProjectStart,
    extendsProjectEnd,
    extendsLocationStart,
    extendsLocationEnd,
    proposedProjectStart,
    proposedProjectEnd,
    proposedLocationStart,
    proposedLocationEnd,
  };
}

/** True when the proposed span adds days outside the existing assignment span. */
export function isGanttAssignmentDayExtension(
  existingSpan: GanttAssignmentSpan | null,
  proposedSpan: GanttAssignmentSpan | null,
): boolean {
  if (!existingSpan || !proposedSpan) return false;
  const oldStart = parseGanttCalendarDate(existingSpan.start);
  const oldEnd = parseGanttCalendarDate(existingSpan.end);
  const newStart = parseGanttCalendarDate(proposedSpan.start);
  const newEnd = parseGanttCalendarDate(proposedSpan.end);
  if (!oldStart || !oldEnd || !newStart || !newEnd) return false;
  return newStart < oldStart || newEnd > oldEnd;
}
