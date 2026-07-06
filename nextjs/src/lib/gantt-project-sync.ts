import { prisma } from "@/lib/prisma";
import { formatGanttInputDate, prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";

type ProjectSyncRow = {
  id: bigint;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string | null;
  createdBy: bigint | null;
};

function mapProjectStatusToGantt(status: string | null | undefined): string {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "finished") return "completed";
  if (s === "onhold" || s === "on hold") return "on_hold";
  return "active";
}

function resolveGanttDates(startDate: Date | null, endDate: Date | null): { start: Date; end: Date } | null {
  const start = startDate ?? endDate;
  const end = endDate ?? startDate;
  if (!start || !end) return null;

  const startStr = formatGanttInputDate(start instanceof Date ? start.toISOString() : String(start));
  const endStr = formatGanttInputDate(end instanceof Date ? end.toISOString() : String(end));
  if (!startStr || !endStr) return null;

  return {
    start: prismaDateFromDateOnlyInput(startStr),
    end: prismaDateFromDateOnlyInput(endStr),
  };
}

/** Create or update a gantt_projects row linked to a main projects row. */
export async function syncProjectToGantt(project: ProjectSyncRow): Promise<void> {
  if (!project.createdBy) return;

  const dates = resolveGanttDates(project.startDate, project.endDate);
  if (!dates) return;

  const companyId = String(project.createdBy);
  const existing =
    (await prisma.ganttProject.findFirst({
      where: { projectRefId: project.id, companyId },
    })) ??
    (await prisma.ganttProject.findFirst({
      where: { projectRefId: project.id },
    }));

  const data = {
    name: project.name,
    startDate: dates.start,
    endDate: dates.end,
    status: mapProjectStatusToGantt(project.status),
    companyId,
    projectRefId: project.id,
  };

  if (existing) {
    await prisma.ganttProject.update({ where: { id: existing.id }, data });
  } else {
    await prisma.ganttProject.create({
      data: { ...data, color: "#3B82F6" },
    });
  }
}

/** Sync all company projects to gantt (creates missing rows and refreshes dates on linked rows). */
export async function syncMissingCompanyProjectsToGantt(companyId: bigint | string): Promise<void> {
  const companyKey = typeof companyId === "bigint" ? companyId : BigInt(companyId);

  const projects = await prisma.project.findMany({
    where: { createdBy: companyKey },
    select: { id: true, name: true, startDate: true, endDate: true, status: true, createdBy: true },
  });

  await Promise.all(projects.map((p) => syncProjectToGantt(p)));
}

export async function markGanttProjectDeleted(projectId: bigint, companyId: bigint): Promise<void> {
  await prisma.ganttProject.updateMany({
    where: { projectRefId: projectId, companyId: String(companyId) },
    data: { status: "Deleted" },
  });
}
