import type { GanttDayScheduleEntry } from "@/lib/gantt-assignment-schedule";
import {
  computeGanttAssignmentSpan,
  detectGanttEventDateExtensionConflict,
  isGanttAssignmentDayExtension,
  resolveGanttEventBounds,
} from "@/lib/gantt-event-date-conflict";
import {
  applyGanttEventDateExtension,
  serializeEventExtensionConflict,
} from "@/lib/gantt-extend-event-dates";
import { formatGanttInputDate } from "@/lib/gantt-dates";
import { prisma } from "@/lib/prisma";

export type StaffAssignmentSaveInput = {
  startDate?: string | null;
  endDate?: string | null;
  daySchedule?: GanttDayScheduleEntry[];
  extendEventDates?: boolean;
};

export type StaffAssignmentSaveGuardResult =
  | { ok: true; conflict: null }
  | { ok: true; conflict: NonNullable<ReturnType<typeof detectGanttEventDateExtensionConflict>>; extended: true }
  | {
      ok: false;
      status: 403 | 409;
      error: string;
      conflict?: ReturnType<typeof serializeEventExtensionConflict>;
    };

type ExistingAssignmentRow = {
  id: string;
  projectId: string;
  locationId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  label: string;
};

type ProjectRow = {
  id: string;
  startDate: Date;
  endDate: Date;
};

type LocationRow = {
  id: string;
  startDate: Date | null;
  endDate: Date | null;
  name: string;
} | null;

export async function guardAndApplyGanttStaffAssignmentDates(input: {
  isAdmin: boolean;
  existing: ExistingAssignmentRow | null;
  project: ProjectRow;
  location: LocationRow;
  body: StaffAssignmentSaveInput;
}): Promise<StaffAssignmentSaveGuardResult> {
  const proposedSpan = computeGanttAssignmentSpan(
    input.body.startDate ?? (input.existing ? formatGanttInputDate(input.existing.startDate) : null),
    input.body.endDate ?? (input.existing ? formatGanttInputDate(input.existing.endDate) : null),
    input.body.daySchedule,
    input.existing?.label,
  );

  if (input.existing) {
    const existingSpan = computeGanttAssignmentSpan(
      formatGanttInputDate(input.existing.startDate),
      formatGanttInputDate(input.existing.endDate),
      undefined,
      input.existing.label,
    );
    if (!input.isAdmin && isGanttAssignmentDayExtension(existingSpan, proposedSpan)) {
      return {
        ok: false,
        status: 403,
        error: "Only administrators can add or extend working days.",
      };
    }
  } else if (!input.isAdmin) {
    return {
      ok: false,
      status: 403,
      error: "Only administrators can create staff assignments.",
    };
  }

  const eventBounds = resolveGanttEventBounds({
    projectStartDate: formatGanttInputDate(input.project.startDate),
    projectEndDate: formatGanttInputDate(input.project.endDate),
    locationStartDate: input.location?.startDate ? formatGanttInputDate(input.location.startDate) : null,
    locationEndDate: input.location?.endDate ? formatGanttInputDate(input.location.endDate) : null,
    locationName: input.location?.name ?? null,
  });

  const conflict = detectGanttEventDateExtensionConflict({
    assignmentSpan: proposedSpan,
    eventBounds,
  });

  if (!conflict?.exceedsEventDates) {
    return { ok: true, conflict: null };
  }

  if (!input.body.extendEventDates) {
    return {
      ok: false,
      status: 409,
      error: "Assignment extends beyond event dates. Approve event date extension to continue.",
      conflict: serializeEventExtensionConflict(conflict),
    };
  }

  if (!input.isAdmin) {
    return {
      ok: false,
      status: 403,
      error: "Only administrators can extend event dates.",
    };
  }

  await applyGanttEventDateExtension(input.project.id, input.location?.id ?? null, conflict);
  return { ok: true, conflict, extended: true };
}

export async function loadGanttStaffAssignmentContext(projectId: string, locationId: string | null) {
  const project = await prisma.ganttProject.findUnique({
    where: { id: projectId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!project) return null;

  let location: LocationRow = null;
  if (locationId) {
    location = await prisma.ganttProjectLocation.findFirst({
      where: { id: locationId, projectId },
      select: { id: true, startDate: true, endDate: true, name: true },
    });
  }

  return { project, location };
}
