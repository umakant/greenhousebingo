/* eslint-disable no-console */
/**
 * Backfill project schedule rows from linked Gantt staff assignments.
 * Usage: node ./scripts/sync-gantt-project-schedule.js [projectId]
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SCHEDULE_PREFIX = "__schedule__:";

function prismaDateFromDateOnlyInput(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s).trim());
  if (!m) return new Date(s);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0));
}

function formatGanttInputDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s).trim());
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function resolveSchedule(label, startDate, endDate) {
  if (label?.startsWith(SCHEDULE_PREFIX)) {
    try {
      const parsed = JSON.parse(label.slice(SCHEDULE_PREFIX.length));
      if (Array.isArray(parsed)) {
        return new Map(parsed.map((row) => [row.date, row]));
      }
    } catch {
      return new Map();
    }
  }
  if (!startDate || !endDate) return new Map();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const map = new Map();
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = formatGanttInputDate(d.toISOString());
    map.set(date, { date, enabled: true, startTime: "07:00", endTime: "17:00" });
  }
  return map;
}

async function resolveUser(staff, companyId) {
  const email = staff.email?.trim().toLowerCase() ?? "";
  const name = staff.name.trim();
  if (!name) return null;

  if (email) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  if (email) {
    const hrm = await prisma.hrmEmployee.findFirst({
      where: { createdBy: companyId, email: { equals: email, mode: "insensitive" } },
      select: { id: true, userId: true },
    });
    if (hrm?.userId) return hrm.userId;
    if (hrm && email) {
      const maxId = await prisma.user.aggregate({ _max: { id: true } });
      const newId = (maxId._max.id ?? BigInt(0)) + BigInt(1);
      const created = await prisma.user.create({
        data: {
          id: newId,
          name,
          email,
          type: "staff",
          createdBy: companyId,
          operationsRole: "agent",
          isActive: true,
        },
      });
      await prisma.hrmEmployee.update({ where: { id: hrm.id }, data: { userId: created.id } });
      return created.id;
    }
  }

  if (email) {
    const maxId = await prisma.user.aggregate({ _max: { id: true } });
    const newId = (maxId._max.id ?? BigInt(0)) + BigInt(1);
    const created = await prisma.user.create({
      data: {
        id: newId,
        name,
        email,
        type: "staff",
        createdBy: companyId,
        operationsRole: "agent",
        isActive: true,
      },
    });
    return created.id;
  }

  return null;
}

async function syncProject(projectId) {
  const ganttProjects = await prisma.ganttProject.findMany({
    where: { projectRefId: projectId },
    select: { id: true, companyId: true },
  });
  if (!ganttProjects.length) {
    console.log(`No linked Gantt project for project ${projectId}`);
    return 0;
  }

  const ganttIds = ganttProjects.map((g) => g.id);
  const assignments = await prisma.ganttProjectStaff.findMany({
    where: { projectId: { in: ganttIds } },
    include: { staff: true, location: true, project: true },
  });

  const activeIds = assignments.map((a) => a.id);
  await prisma.projectStaffAssignment.deleteMany({
    where: {
      projectId,
      ganttAssignmentId: activeIds.length > 0 ? { notIn: activeIds } : { not: null },
    },
  });

  let total = 0;
  for (const assignment of assignments) {
    if (!assignment.staff) continue;
    const companyId = BigInt(assignment.project.companyId);
    const userId = await resolveUser(assignment.staff, companyId);
    if (!userId) {
      console.warn(`Could not resolve user for ${assignment.staff.name}`);
      continue;
    }

    await prisma.projectStaffAssignment.deleteMany({
      where: { ganttAssignmentId: assignment.id },
    });

    const startStr = assignment.startDate ? formatGanttInputDate(assignment.startDate.toISOString()) : null;
    const endStr = assignment.endDate ? formatGanttInputDate(assignment.endDate.toISOString()) : null;
    const byDate = resolveSchedule(assignment.label, startStr, endStr);
    const enabledDays = [...byDate.values()].filter((row) => row.enabled !== false);
    if (!enabledDays.length) continue;

    const result = await prisma.projectStaffAssignment.createMany({
      data: enabledDays.map((day, index) => ({
        projectId,
        userId,
        role: "agent",
        workDate: prismaDateFromDateOnlyInput(day.date),
        endDate: prismaDateFromDateOnlyInput(day.date),
        startTime: day.startTime || null,
        endTime: day.endTime || null,
        position: assignment.location?.name ?? null,
        status: "pending",
        onSite: false,
        sortOrder: index,
        ganttAssignmentId: assignment.id,
        updatedAt: new Date(),
      })),
    });
    total += result.count;
    console.log(`  ${assignment.staff.name}: ${result.count} day(s)`);
  }

  return total;
}

async function main() {
  const projectId = BigInt(process.argv[2] || "10");
  const total = await syncProject(projectId);
  console.log(`Synced ${total} schedule row(s) for project ${projectId}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
