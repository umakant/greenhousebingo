import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGanttStaffAssignmentsForProject } from "@/lib/gantt-project-staff-sync";
import { getProjectOpsContext } from "@/lib/project-operations-api";
import { calcHoursFromTimes, eachDateInRange } from "@/lib/project-staff-hours";

export const dynamic = "force-dynamic";

type DayRow = {
  date: string;
  agents: number;
  medics: number;
  security: number;
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await syncGanttStaffAssignmentsForProject(projectId).catch(() => {});

  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { startDate: true, endDate: true },
  });

  const rows = await prisma.projectStaffAssignment.findMany({ where: { projectId } });
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const dateSet = new Set<string>();
  if (project?.startDate && project?.endDate) {
    eachDateInRange(
      project.startDate.toISOString().slice(0, 10),
      project.endDate.toISOString().slice(0, 10),
    ).forEach((d) => dateSet.add(d));
  }
  for (const r of rows) {
    if (r.workDate) dateSet.add(r.workDate.toISOString().slice(0, 10));
    if (r.endDate) {
      const start = r.workDate?.toISOString().slice(0, 10) ?? r.endDate.toISOString().slice(0, 10);
      eachDateInRange(start, r.endDate.toISOString().slice(0, 10)).forEach((d) => dateSet.add(d));
    }
  }

  const dates = [...dateSet].sort();
  const dayMap = new Map<string, DayRow>();
  for (const date of dates) {
    dayMap.set(date, { date, agents: 0, medics: 0, security: 0 });
  }

  const personStats = new Map<
    number,
    { user_id: number; name: string; role: string; days: number; hours: number }
  >();

  for (const r of rows) {
    const u = userMap.get(r.userId);
    const name = u?.name ?? u?.email ?? "Unknown";
    const hoursPerDay = calcHoursFromTimes(r.startTime, r.endTime);
    let assignmentDates: string[] = [];
    if (r.workDate) {
      const start = r.workDate.toISOString().slice(0, 10);
      const end = r.endDate?.toISOString().slice(0, 10) ?? start;
      assignmentDates = eachDateInRange(start, end);
    }
    for (const date of assignmentDates) {
      const day = dayMap.get(date);
      if (day) {
        if (r.role === "agent") day.agents += 1;
        else if (r.role === "medic") day.medics += 1;
        else if (r.role === "security") day.security += 1;
      }
    }
    const uid = Number(r.userId);
    const bucket = personStats.get(uid) ?? {
      user_id: uid,
      name,
      role: r.role,
      days: 0,
      hours: 0,
    };
    bucket.days += assignmentDates.length || 1;
    bucket.hours += hoursPerDay * (assignmentDates.length || 1);
    personStats.set(uid, bucket);
  }

  const staff = [...personStats.values()];
  const totalHours = staff.reduce((s, p) => s + p.hours, 0);
  const uniquePersonnel = staff.length;
  const daysWithCoverage = [...dayMap.values()].filter(
    (d) => d.agents > 0 || d.medics > 0 || d.security > 0,
  ).length;
  const avgHoursPerDay = daysWithCoverage > 0 ? Math.round((totalHours / daysWithCoverage) * 10) / 10 : 0;

  const byRole = {
    agent: { personnel: staff.filter((s) => s.role === "agent").length, hours: staff.filter((s) => s.role === "agent").reduce((a, b) => a + b.hours, 0) },
    medic: { personnel: staff.filter((s) => s.role === "medic").length, hours: staff.filter((s) => s.role === "medic").reduce((a, b) => a + b.hours, 0) },
    security: { personnel: staff.filter((s) => s.role === "security").length, hours: staff.filter((s) => s.role === "security").reduce((a, b) => a + b.hours, 0) },
  };

  return NextResponse.json({
    days: [...dayMap.values()],
    summary: {
      total_personnel: uniquePersonnel,
      total_hours: Math.round(totalHours),
      days_with_coverage: daysWithCoverage,
      avg_hours_per_day: avgHoursPerDay,
    },
    by_role: byRole,
    staff_hours: staff.map((s) => ({
      user_id: s.user_id,
      name: s.name,
      role: s.role,
      days: s.days,
      hours: Math.round(s.hours),
    })),
  });
}
