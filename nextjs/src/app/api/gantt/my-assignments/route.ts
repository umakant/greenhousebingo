import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";

import { parseAssignmentSchedule } from "@/lib/gantt-assignment-schedule";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";
import { buildGanttClockMap, buildGanttStaffConflictDateMap, resolveStaffDayStatus } from "@/lib/gantt-staff-day-status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getActor(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return null;
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const user = email
    ? await prisma.user.findFirst({ where: { email }, select: { name: true } })
    : null;
  return { email, companyId: ctx.companyId, name: user?.name ?? null };
}

function serDate(d: Date | null | undefined) {
  if (!d) return null;
  return format(d, "yyyy-MM-dd");
}

export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await prisma.ganttStaff.findFirst({
    where: {
      companyId: actor.companyId,
      email: { equals: actor.email, mode: "insensitive" },
    },
  });

  if (!staff) {
    return NextResponse.json({ ok: true, staff: null, items: [] });
  }

  const assignments = await prisma.ganttProjectStaff.findMany({
    where: {
      staffId: staff.id,
      NOT: { label: "__deleted__" },
      project: { companyId: actor.companyId, NOT: { status: "Deleted" } },
    },
    orderBy: { startDate: "asc" },
    include: {
      project: { select: { id: true, name: true, color: true, startDate: true, endDate: true } },
      location: { select: { id: true, name: true } },
    },
  });

  const assignmentIds = assignments.map((a) => a.id);
  const hourEntries = assignmentIds.length
    ? await prisma.ganttHourEntry.findMany({
        where: { assignmentId: { in: assignmentIds }, assignmentType: "staff" },
        orderBy: { date: "asc" },
      })
    : [];

  const clockMap = buildGanttClockMap(
    hourEntries.map((e) => ({
      assignmentId: e.assignmentId,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
    })),
  );

  const conflictMap = buildGanttStaffConflictDateMap(
    assignments.map((a) => ({
      id: a.id,
      staffId: a.staffId,
      label: a.label,
      startDate: serDate(a.startDate),
      endDate: serDate(a.endDate),
    })),
  );

  const items = assignments.map((a) => {
    const schedule = parseAssignmentSchedule(a.label) ?? [];
    const enabledDays = schedule.filter((d) => d.enabled);
    const days = enabledDays.map((day) => ({
      ...day,
      status: resolveStaffDayStatus(
        {
          id: a.id,
          approvalStatus: a.approvalStatus,
          notifiedAt: a.notifiedAt?.toISOString() ?? null,
        },
        day.date,
        day,
        conflictMap.get(a.id),
      ),
      clockedIn: clockMap.get(`${a.id}:${day.date}`)?.startTime ?? null,
    }));

    return {
      id: a.id,
      projectId: a.projectId,
      projectName: a.project.name,
      projectColor: a.project.color,
      locationName: a.location?.name ?? null,
      startDate: serDate(a.startDate),
      endDate: serDate(a.endDate),
      startDateDisplay: a.startDate ? format(a.startDate, "MMM d, yyyy") : null,
      endDateDisplay: a.endDate ? format(a.endDate, "MMM d, yyyy") : null,
      approvalStatus: a.approvalStatus,
      notifiedAt: a.notifiedAt?.toISOString() ?? null,
      days,
    };
  });

  return NextResponse.json({
    ok: true,
    staff: { id: staff.id, name: staff.name, email: staff.email },
    items,
  });
}
