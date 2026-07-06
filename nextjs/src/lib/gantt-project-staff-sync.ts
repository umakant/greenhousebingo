import { formatGanttInputDate, prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";
import { resolveStaffAssignmentSchedule } from "@/lib/gantt-assignment-schedule";
import { prisma } from "@/lib/prisma";

const ROLES = new Set(["agent", "medic", "security"]);

function mapApprovalStatus(approvalStatus: string): string {
  const s = approvalStatus.trim().toLowerCase();
  if (s === "approved") return "confirmed";
  if (s === "rejected") return "rejected";
  return "pending";
}

function normalizeRole(value: string | null | undefined): "agent" | "medic" | "security" {
  const r = (value ?? "").trim().toLowerCase();
  if (r === "medic") return "medic";
  if (r === "security") return "security";
  return "agent";
}

async function nextUserId(): Promise<bigint> {
  const maxId = await prisma.user.aggregate({ _max: { id: true } });
  return (maxId._max.id ?? BigInt(0)) + BigInt(1);
}

async function createPortalStaffUser(
  staff: { name: string; email: string },
  companyId: bigint,
  role: "agent" | "medic" | "security",
): Promise<bigint> {
  const newId = await nextUserId();
  const created = await prisma.user.create({
    data: {
      id: newId,
      name: staff.name,
      email: staff.email,
      type: "staff",
      createdBy: companyId,
      operationsRole: role,
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

/** Resolve portal user for a Gantt staff row (portal user, HRM employee, or create). */
export async function resolveUserForGanttStaff(
  staff: { name: string; email: string | null },
  companyId: bigint,
): Promise<{ userId: bigint; role: "agent" | "medic" | "security" } | null> {
  const email = staff.email?.trim().toLowerCase() ?? "";
  const name = staff.name.trim();
  if (!name) return null;

  if (email) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, operationsRole: true },
    });
    if (byEmail) {
      return { userId: byEmail.id, role: normalizeRole(byEmail.operationsRole) };
    }
  }

  if (email) {
    const hrmEmployee = await prisma.hrmEmployee.findFirst({
      where: { createdBy: companyId, email: { equals: email, mode: "insensitive" } },
      select: { id: true, userId: true, firstName: true, lastName: true },
    });
    if (hrmEmployee?.userId) {
      const linked = await prisma.user.findFirst({
        where: { id: hrmEmployee.userId },
        select: { id: true, operationsRole: true },
      });
      if (linked) {
        return { userId: linked.id, role: normalizeRole(linked.operationsRole) };
      }
    }
    if (hrmEmployee && email) {
      const userId = await createPortalStaffUser({ name, email }, companyId, "agent");
      await prisma.hrmEmployee.update({
        where: { id: hrmEmployee.id },
        data: { userId },
      });
      return { userId, role: "agent" };
    }
  }

  const byName = await prisma.user.findFirst({
    where: { name, createdBy: companyId, type: "staff" },
    select: { id: true, operationsRole: true },
  });
  if (byName) {
    return { userId: byName.id, role: normalizeRole(byName.operationsRole) };
  }

  if (!email) return null;

  const userId = await createPortalStaffUser({ name, email }, companyId, "agent");
  return { userId, role: "agent" };
}

type GanttStaffAssignmentRow = {
  id: string;
  label: string;
  startDate: Date | null;
  endDate: Date | null;
  approvalStatus: string;
  staff: { name: string; email: string | null } | null;
  location: { name: string } | null;
  project: { projectRefId: bigint | null; companyId: string | null };
};

/** Mirror one gantt staff assignment into project_staff_assignments (one row per enabled day). */
export async function syncGanttAssignmentToProjectOps(ganttAssignmentId: string): Promise<void> {
  const assignment = await prisma.ganttProjectStaff.findUnique({
    where: { id: ganttAssignmentId },
    include: {
      staff: { select: { name: true, email: true } },
      location: { select: { name: true } },
      project: { select: { projectRefId: true, companyId: true } },
    },
  });
  if (!assignment?.project.projectRefId || !assignment.project.companyId) return;

  await syncGanttAssignmentRow(assignment);
}

async function syncGanttAssignmentRow(assignment: GanttStaffAssignmentRow): Promise<void> {
  const projectId = assignment.project.projectRefId;
  const companyId = assignment.project.companyId;
  if (!projectId || !companyId) return;

  await prisma.projectStaffAssignment.deleteMany({
    where: { ganttAssignmentId: assignment.id },
  });

  if (!assignment.staff) return;

  const resolved = await resolveUserForGanttStaff(assignment.staff, BigInt(companyId));
  if (!resolved) return;

  const startStr = assignment.startDate ? formatGanttInputDate(assignment.startDate.toISOString()) : null;
  const endStr = assignment.endDate ? formatGanttInputDate(assignment.endDate.toISOString()) : null;
  const { byDate } = resolveStaffAssignmentSchedule(assignment.label, startStr, endStr);

  const enabledDays = [...byDate.values()].filter((row) => row.enabled);
  if (enabledDays.length === 0) return;

  const status = mapApprovalStatus(assignment.approvalStatus);
  const position = assignment.location?.name ?? null;
  const now = new Date();

  await prisma.projectStaffAssignment.createMany({
    data: enabledDays.map((day, index) => ({
      projectId,
      userId: resolved.userId,
      role: resolved.role,
      workDate: prismaDateFromDateOnlyInput(day.date),
      endDate: prismaDateFromDateOnlyInput(day.date),
      startTime: day.startTime || null,
      endTime: day.endTime || null,
      position,
      status,
      onSite: false,
      sortOrder: index,
      ganttAssignmentId: assignment.id,
      updatedAt: now,
    })),
  });
}

/** Sync all gantt staff assignments linked to a main project (idempotent backfill). */
export async function syncGanttStaffAssignmentsForProject(projectId: bigint): Promise<void> {
  const ganttProjects = await prisma.ganttProject.findMany({
    where: { projectRefId: projectId },
    select: { id: true },
  });
  if (ganttProjects.length === 0) return;

  const ganttIds = ganttProjects.map((p) => p.id);
  const assignments = await prisma.ganttProjectStaff.findMany({
    where: { projectId: { in: ganttIds } },
    include: {
      staff: { select: { name: true, email: true } },
      location: { select: { name: true } },
      project: { select: { projectRefId: true, companyId: true } },
    },
  });

  const activeIds = assignments.map((a) => a.id);
  await prisma.projectStaffAssignment.deleteMany({
    where: {
      projectId,
      ganttAssignmentId: activeIds.length > 0 ? { notIn: activeIds } : { not: null },
    },
  });

  for (const assignment of assignments) {
    await syncGanttAssignmentRow(assignment);
  }
}

/** Remove mirrored project ops rows when a gantt assignment is deleted. */
export async function deleteProjectOpsForGanttAssignment(ganttAssignmentId: string): Promise<void> {
  await prisma.projectStaffAssignment.deleteMany({
    where: { ganttAssignmentId },
  });
}

export function isValidOpsRole(role: string): boolean {
  return ROLES.has(role);
}
