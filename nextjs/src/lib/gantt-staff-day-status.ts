import { format, startOfDay } from "date-fns";

import {
  resolveStaffAssignmentSchedule,
  type GanttDayScheduleEntry,
} from "@/lib/gantt-assignment-schedule";

/** Staff schedule block colors (Gantt + assignment editor + project schedule). */
export const GANTT_STAFF_DAY_COLORS = {
  begin: "#FFFFFF",
  accept: "#EAB308",
  decline: "#EF4444",
  conflict: "#3B82F6",
  confirmed: "#22C55E",
} as const;

export const GANTT_STAFF_DAY_STATUS_ORDER = [
  "begin",
  "accept",
  "decline",
  "conflict",
  "confirmed",
] as const satisfies readonly GanttStaffDayStatus[];

export type GanttStaffDayStatus = keyof typeof GANTT_STAFF_DAY_COLORS;

export type GanttClockEntry = {
  assignmentId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
};

export type StaffAssignmentStatusInput = {
  id: string;
  approvalStatus: string;
  notifiedAt: string | null;
};

type ConflictAssignmentRow = {
  id: string;
  staffId: string | null;
  label?: string | null;
  startDate: string | null;
  endDate: string | null;
};

function normalizeApproval(status: string): "pending" | "approved" | "rejected" {
  const s = status.trim().toLowerCase();
  if (s === "approved" || s === "confirmed" || s === "complete" || s === "completed") {
    return "approved";
  }
  if (s === "rejected" || s === "declined" || s === "decline") {
    return "rejected";
  }
  return "pending";
}

/** Whether the employee has clocked in for this assignment day. */
export function isStaffDayClockedIn(
  assignmentId: string,
  dateKey: string,
  clockMap: Map<string, GanttClockEntry>,
): boolean {
  const key = `${assignmentId}:${dateKey}`;
  const row = clockMap.get(key);
  return Boolean(row?.startTime);
}

/**
 * Resolve staff day status for Gantt blocks and schedule cells.
 * White = to begin, Yellow = accept, Red = decline, Blue = conflict, Green = confirmed.
 */
export function resolveStaffDayStatus(
  assignment: StaffAssignmentStatusInput,
  dateKey: string,
  _scheduleEntry?: GanttDayScheduleEntry,
  conflictDates?: Set<string>,
): GanttStaffDayStatus {
  if (conflictDates?.has(dateKey)) {
    return "conflict";
  }

  const approval = normalizeApproval(assignment.approvalStatus);
  if (approval === "rejected") return "decline";
  if (approval === "approved") return "confirmed";

  if (assignment.notifiedAt) return "accept";
  return "begin";
}

/** Map project schedule row status to staff day status. */
export function resolveScheduleRowStaffStatus(
  status: string,
  onSite: boolean,
): GanttStaffDayStatus {
  const approval = normalizeApproval(status);
  if (approval === "rejected") return "decline";
  if (approval === "approved" || onSite) return "confirmed";
  return "accept";
}

export function staffDayStatusColor(status: GanttStaffDayStatus): string {
  return GANTT_STAFF_DAY_COLORS[status];
}

export function staffDayStatusLabel(status: GanttStaffDayStatus): string {
  if (status === "begin") return "To begin with";
  if (status === "accept") return "Accept";
  if (status === "decline") return "Decline";
  if (status === "conflict") return "Conflict";
  return "Confirmed";
}

export function staffDayStatusCellStyle(status: GanttStaffDayStatus): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const bg = staffDayStatusColor(status);
  if (status === "begin") {
    return { backgroundColor: bg, color: "#374151", borderColor: "#D1D5DB" };
  }
  if (status === "accept") {
    return { backgroundColor: bg, color: "#422006", borderColor: `${bg}cc` };
  }
  return { backgroundColor: bg, color: "#ffffff", borderColor: `${bg}cc` };
}

/** Per-assignment set of date keys where the same staff has overlapping shifts. */
export function buildGanttStaffConflictDateMap(
  assignments: ConflictAssignmentRow[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const byStaff = new Map<string, ConflictAssignmentRow[]>();

  for (const row of assignments) {
    if (!row.staffId) continue;
    if (!byStaff.has(row.staffId)) byStaff.set(row.staffId, []);
    byStaff.get(row.staffId)!.push(row);
  }

  for (const rows of byStaff.values()) {
    if (rows.length < 2) continue;

    for (const assignment of rows) {
      const { byDate } = resolveStaffAssignmentSchedule(
        assignment.label,
        assignment.startDate,
        assignment.endDate,
      );

      for (const [dateKey, entry] of byDate) {
        if (!entry.enabled) continue;

        const hasConflict = rows.some((other) => {
          if (other.id === assignment.id) return false;
          const otherSchedule = resolveStaffAssignmentSchedule(
            other.label,
            other.startDate,
            other.endDate,
          );
          return otherSchedule.byDate.get(dateKey)?.enabled === true;
        });

        if (!hasConflict) continue;
        if (!map.has(assignment.id)) map.set(assignment.id, new Set());
        map.get(assignment.id)!.add(dateKey);
      }
    }
  }

  return map;
}

/** Dates where the staff member already has an enabled shift on another assignment. */
export function buildStaffScheduleConflictDates(
  staffId: string,
  enabledDates: Iterable<string>,
  assignments: ConflictAssignmentRow[],
): Set<string> {
  const enabled = new Set(enabledDates);
  const conflicts = new Set<string>();
  for (const row of assignments) {
    if (!row.staffId || row.staffId !== staffId) continue;
    const { byDate } = resolveStaffAssignmentSchedule(row.label, row.startDate, row.endDate);
    for (const dateKey of enabled) {
      if (byDate.get(dateKey)?.enabled) conflicts.add(dateKey);
    }
  }
  return conflicts;
}

/** Build lookup map from hour-entry rows. */
export function buildGanttClockMap(
  entries: Array<{
    assignmentId: string;
    date: string | Date;
    startTime?: string | null;
    endTime?: string | null;
  }>,
): Map<string, GanttClockEntry> {
  const map = new Map<string, GanttClockEntry>();
  for (const row of entries) {
    const dateKey =
      row.date instanceof Date
        ? format(row.date, "yyyy-MM-dd")
        : String(row.date).slice(0, 10);
    const key = `${row.assignmentId}:${dateKey}`;
    map.set(key, {
      assignmentId: row.assignmentId,
      date: dateKey,
      startTime: row.startTime ?? null,
      endTime: row.endTime ?? null,
    });
  }
  return map;
}
