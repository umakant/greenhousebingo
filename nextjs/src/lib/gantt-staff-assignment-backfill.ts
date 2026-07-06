import {
  buildDaySchedule,
  SCHEDULE_LABEL_PREFIX,
  serializeAssignmentSchedule,
} from "@/lib/gantt-assignment-schedule";
import { formatGanttInputDate } from "@/lib/gantt-dates";
import { prisma } from "@/lib/prisma";

/** Replace legacy name-only labels with serialized day schedules when dates exist. */
export async function backfillGanttStaffAssignmentSchedules(companyId: string): Promise<number> {
  const assignments = await prisma.ganttProjectStaff.findMany({
    where: {
      project: { companyId },
      startDate: { not: null },
      endDate: { not: null },
      NOT: { label: { startsWith: SCHEDULE_LABEL_PREFIX } },
    },
    select: { id: true, startDate: true, endDate: true },
  });

  let updated = 0;
  for (const assignment of assignments) {
    const start = formatGanttInputDate(assignment.startDate?.toISOString() ?? null);
    const end = formatGanttInputDate(assignment.endDate?.toISOString() ?? null);
    if (!start || !end) continue;

    const schedule = buildDaySchedule(start, end);
    if (schedule.length === 0) continue;

    await prisma.ganttProjectStaff.update({
      where: { id: assignment.id },
      data: { label: serializeAssignmentSchedule(schedule) },
    });
    updated += 1;
  }

  return updated;
}
