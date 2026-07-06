import { NextResponse, type NextRequest } from "next/server";

import {
  serializeAssignmentSchedule,
  type GanttDayScheduleEntry,
} from "@/lib/gantt-assignment-schedule";
import { resolveGanttProjectAdmin } from "@/lib/gantt-admin-auth";
import { notifyGanttStaffAssignmentById } from "@/lib/gantt-assignment-notify";
import { formatGanttInputDate, prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";
import { syncGanttAssignmentToProjectOps } from "@/lib/gantt-project-staff-sync";
import {
  guardAndApplyGanttStaffAssignmentDates,
  loadGanttStaffAssignmentContext,
} from "@/lib/gantt-staff-assignment-save";
import { prisma } from "@/lib/prisma";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";

export const dynamic = "force-dynamic";

function ser(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === "object" && !Array.isArray(v))
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, ser(val)]));
  if (Array.isArray(v)) return v.map(ser);
  return v;
}

export async function POST(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = await prisma.ganttProject.findFirst({ where: { id: body.projectId, companyId: ctx.companyId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const isAdmin = await resolveGanttProjectAdmin(req);
  const locationId = body.locationId ?? null;
  const ctxDates = await loadGanttStaffAssignmentContext(body.projectId, locationId);
  if (!ctxDates) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let startDate = body.startDate ? prismaDateFromDateOnlyInput(body.startDate) : null;
  let endDate = body.endDate ? prismaDateFromDateOnlyInput(body.endDate) : null;
  if (!startDate || !endDate) {
    let loc: { startDate: Date | null; endDate: Date | null } | null = null;
    if (locationId) {
      loc = await prisma.ganttProjectLocation.findFirst({
        where: { id: locationId, projectId: body.projectId },
        select: { startDate: true, endDate: true },
      });
    }
    if (!startDate) startDate = loc?.startDate ?? project.startDate;
    if (!endDate) endDate = loc?.endDate ?? project.endDate;
  }

  const dateGuard = await guardAndApplyGanttStaffAssignmentDates({
    isAdmin,
    existing: null,
    project: ctxDates.project,
    location: ctxDates.location,
    body: {
      startDate: body.startDate ?? formatGanttInputDate(startDate),
      endDate: body.endDate ?? formatGanttInputDate(endDate),
      daySchedule: body.daySchedule as GanttDayScheduleEntry[] | undefined,
      extendEventDates: body.extendEventDates === true,
    },
  });
  if (!dateGuard.ok) {
    return NextResponse.json(
      { error: dateGuard.error, conflict: dateGuard.conflict },
      { status: dateGuard.status },
    );
  }

  if (dateGuard.ok && "extended" in dateGuard && dateGuard.extended) {
    const refreshed = await loadGanttStaffAssignmentContext(body.projectId, locationId);
    if (refreshed) {
      ctxDates.project = refreshed.project;
      ctxDates.location = refreshed.location;
    }
  }

  const label =
    body.daySchedule !== undefined
      ? serializeAssignmentSchedule(body.daySchedule as GanttDayScheduleEntry[])
      : body.label ?? "";

  const shouldNotify = body.notifyStaff !== false && Boolean(body.staffId);

  const assignment = await prisma.ganttProjectStaff.create({
    data: {
      projectId: body.projectId,
      locationId: body.locationId ?? null,
      staffId: body.staffId ?? null,
      label,
      startDate,
      endDate,
      ...(shouldNotify ? { notifiedAt: new Date() } : {}),
    },
    include: { staff: true, project: { select: { name: true } }, location: { select: { name: true } } },
  });

  await syncGanttAssignmentToProjectOps(assignment.id).catch(() => {});

  let notification = null;
  if (shouldNotify) {
    notification = await notifyGanttStaffAssignmentById(ctx.companyId, assignment.id);
  }

  return NextResponse.json(
    ser({
      ...assignment,
      notification,
      eventDatesExtended: dateGuard.ok && "extended" in dateGuard ? dateGuard.extended : false,
    }),
    { status: 201 },
  );
}
