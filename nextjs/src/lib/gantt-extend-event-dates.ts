import { formatGanttInputDate, prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";
import type { GanttEventDateExtensionConflict } from "@/lib/gantt-event-date-conflict";
import { prisma } from "@/lib/prisma";

/** Extend gantt project/location event dates (and linked project record) to cover an approved assignment span. */
export async function applyGanttEventDateExtension(
  projectId: string,
  locationId: string | null,
  conflict: GanttEventDateExtensionConflict,
): Promise<{ projectUpdated: boolean; locationUpdated: boolean; linkedProjectUpdated: boolean }> {
  let projectUpdated = false;
  let locationUpdated = false;
  let linkedProjectUpdated = false;

  const project = await prisma.ganttProject.findUnique({
    where: { id: projectId },
    select: { id: true, startDate: true, endDate: true, projectRefId: true },
  });
  if (!project) {
    return { projectUpdated, locationUpdated, linkedProjectUpdated };
  }

  const projectData: { startDate?: Date; endDate?: Date } = {};
  if (conflict.extendsProjectStart) {
    projectData.startDate = prismaDateFromDateOnlyInput(conflict.proposedProjectStart);
    projectUpdated = true;
  }
  if (conflict.extendsProjectEnd) {
    projectData.endDate = prismaDateFromDateOnlyInput(conflict.proposedProjectEnd);
    projectUpdated = true;
  }

  if (projectUpdated) {
    await prisma.ganttProject.update({
      where: { id: projectId },
      data: projectData,
    });
  }

  if (locationId && (conflict.extendsLocationStart || conflict.extendsLocationEnd)) {
    const locationData: { startDate?: Date; endDate?: Date } = {};
    if (conflict.extendsLocationStart && conflict.proposedLocationStart) {
      locationData.startDate = prismaDateFromDateOnlyInput(conflict.proposedLocationStart);
    }
    if (conflict.extendsLocationEnd && conflict.proposedLocationEnd) {
      locationData.endDate = prismaDateFromDateOnlyInput(conflict.proposedLocationEnd);
    }
    if (Object.keys(locationData).length > 0) {
      await prisma.ganttProjectLocation.update({
        where: { id: locationId },
        data: locationData,
      });
      locationUpdated = true;
    }
  }

  if (project.projectRefId && projectUpdated) {
    const linkedData: { startDate?: Date; endDate?: Date } = {};
    if (conflict.extendsProjectStart) {
      linkedData.startDate = prismaDateFromDateOnlyInput(conflict.proposedProjectStart);
    }
    if (conflict.extendsProjectEnd) {
      linkedData.endDate = prismaDateFromDateOnlyInput(conflict.proposedProjectEnd);
    }
    await prisma.project.update({
      where: { id: project.projectRefId },
      data: linkedData,
    });
    linkedProjectUpdated = true;
  }

  return { projectUpdated, locationUpdated, linkedProjectUpdated };
}

export function serializeEventExtensionConflict(conflict: GanttEventDateExtensionConflict) {
  return {
    exceedsEventDates: conflict.exceedsEventDates,
    assignmentSpan: conflict.assignmentSpan,
    eventBounds: conflict.eventBounds,
    proposedProjectStart: conflict.proposedProjectStart,
    proposedProjectEnd: conflict.proposedProjectEnd,
    proposedLocationStart: conflict.proposedLocationStart,
    proposedLocationEnd: conflict.proposedLocationEnd,
    extendsProjectEnd: conflict.extendsProjectEnd,
    extendsProjectStart: conflict.extendsProjectStart,
    extendsLocationEnd: conflict.extendsLocationEnd,
    extendsLocationStart: conflict.extendsLocationStart,
    currentProjectEnd: formatGanttInputDate(conflict.eventBounds.projectEnd),
    currentLocationEnd: conflict.eventBounds.locationEnd,
  };
}
