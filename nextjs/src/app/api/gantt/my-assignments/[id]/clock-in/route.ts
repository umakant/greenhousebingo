import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";

import { isStaffScheduleDayConfirmed, resolveStaffAssignmentSchedule } from "@/lib/gantt-assignment-schedule";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";
import { prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getActor(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return null;
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  return { email, companyId: ctx.companyId };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assignmentId } = await params;
  const body = (await req.json().catch(() => ({}))) as { date?: string };
  const dateKey = body.date?.trim() || format(new Date(), "yyyy-MM-dd");

  const staff = await prisma.ganttStaff.findFirst({
    where: {
      companyId: actor.companyId,
      email: { equals: actor.email, mode: "insensitive" },
    },
  });
  if (!staff) return NextResponse.json({ error: "Staff profile not found." }, { status: 404 });

  const assignment = await prisma.ganttProjectStaff.findFirst({
    where: {
      id: assignmentId,
      staffId: staff.id,
      project: { companyId: actor.companyId },
    },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  const startStr = assignment.startDate ? format(assignment.startDate, "yyyy-MM-dd") : null;
  const endStr = assignment.endDate ? format(assignment.endDate, "yyyy-MM-dd") : null;
  const { byDate, explicit } = resolveStaffAssignmentSchedule(assignment.label, startStr, endStr);
  const inRange = Boolean(startStr && endStr && dateKey >= startStr && dateKey <= endStr);
  if (!isStaffScheduleDayConfirmed(dateKey, inRange, byDate, explicit)) {
    return NextResponse.json({ error: "This day is not scheduled for you." }, { status: 400 });
  }

  const existing = await prisma.ganttHourEntry.findFirst({
    where: {
      assignmentId,
      assignmentType: "staff",
      date: prismaDateFromDateOnlyInput(dateKey),
    },
  });

  const nowTime = format(new Date(), "HH:mm");
  const scheduleDay = byDate.get(dateKey);
  const endTime = scheduleDay?.endTime ?? "17:00";

  if (existing?.startTime) {
    return NextResponse.json({
      ok: true,
      alreadyClockedIn: true,
      startTime: existing.startTime,
      message: "Already clocked in for this day.",
    });
  }

  const entry = existing
    ? await prisma.ganttHourEntry.update({
        where: { id: existing.id },
        data: { startTime: nowTime },
      })
    : await prisma.ganttHourEntry.create({
        data: {
          projectId: assignment.projectId,
          assignmentId,
          assignmentType: "staff",
          date: prismaDateFromDateOnlyInput(dateKey),
          hours: 0,
          startTime: nowTime,
          endTime: null,
        },
      });

  return NextResponse.json({
    ok: true,
    entry: {
      id: entry.id,
      date: dateKey,
      startTime: entry.startTime,
      endTime: entry.endTime,
      scheduledEnd: endTime,
    },
    projectName: assignment.project.name,
  });
}
