import { NextResponse, type NextRequest } from "next/server";

import {
  serializeAssignmentSchedule,
  type GanttDayScheduleEntry,
} from "@/lib/gantt-assignment-schedule";
import { resolveGanttProjectAdmin } from "@/lib/gantt-admin-auth";
import {
  notifyGanttStaffAssignmentRecord,
} from "@/lib/gantt-assignment-notify";
import { formatGanttInputDate, prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";
import {
  deleteProjectOpsForGanttAssignment,
  syncGanttAssignmentToProjectOps,
} from "@/lib/gantt-project-staff-sync";
import {
  guardAndApplyGanttStaffAssignmentDates,
  loadGanttStaffAssignmentContext,
} from "@/lib/gantt-staff-assignment-save";
import { prisma } from "@/lib/prisma";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";

export const dynamic = "force-dynamic";

function ser(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return formatGanttInputDate(v.toISOString()) || v.toISOString();
  if (v !== null && typeof v === "object" && !Array.isArray(v))
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, ser(val)]));
  if (Array.isArray(v)) return v.map(ser);
  return v;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const assignment = await prisma.ganttProjectStaff.findFirst({
    where: { id, project: { companyId: ctx.companyId } },
    include: {
      staff: true,
      location: true,
      project: {
        include: {
          locations: {
            where: { NOT: { name: "__deleted__" } },
            orderBy: { createdAt: "asc" },
            include: {
              staffAssignments: {
                where: { NOT: { label: "__deleted__" } },
                include: { staff: true },
              },
              subAssignments: {
                where: { NOT: { label: "__deleted__" } },
                include: { sub: true },
              },
            },
          },
          staffAssignments: {
            where: { locationId: null, NOT: { label: "__deleted__" } },
            include: { staff: true },
          },
          subAssignments: {
            where: { locationId: null, NOT: { label: "__deleted__" } },
            include: { sub: true },
          },
        },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const { project, location, ...assignmentRow } = assignment;
  return NextResponse.json(
    ser({
      assignment: assignmentRow,
      project,
      location,
    }),
  );
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.ganttProjectStaff.findFirst({
    where: { id, project: { companyId: ctx.companyId } },
    include: {
      staff: true,
      project: { select: { name: true, companyId: true } },
      location: { select: { name: true } },
    },
  });
  if (!existing) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const isAdmin = await resolveGanttProjectAdmin(req);
  const ctxDates = await loadGanttStaffAssignmentContext(existing.projectId, existing.locationId);
  if (!ctxDates) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const dateGuard = await guardAndApplyGanttStaffAssignmentDates({
    isAdmin,
    existing,
    project: ctxDates.project,
    location: ctxDates.location,
    body: {
      startDate: body.startDate,
      endDate: body.endDate,
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

  const scheduleChanged = body.daySchedule !== undefined;
  const datesChanged = body.startDate !== undefined || body.endDate !== undefined;
  const staffChanged = body.staffId !== undefined && body.staffId !== existing.staffId;
  const wantsNotify = body.notifyStaff !== false;
  const shouldNotify = Boolean(
    wantsNotify && (scheduleChanged || datesChanged || staffChanged),
  );

  const label =
    body.daySchedule !== undefined
      ? serializeAssignmentSchedule(body.daySchedule as GanttDayScheduleEntry[])
      : body.label;

  const updated = await prisma.ganttProjectStaff.update({
    where: { id },
    data: {
      ...(body.staffId !== undefined && { staffId: body.staffId }),
      ...(body.startDate !== undefined && {
        startDate: body.startDate ? prismaDateFromDateOnlyInput(body.startDate) : null,
      }),
      ...(body.endDate !== undefined && {
        endDate: body.endDate ? prismaDateFromDateOnlyInput(body.endDate) : null,
      }),
      ...(body.approvalStatus !== undefined && { approvalStatus: body.approvalStatus }),
      ...(label !== undefined && { label }),
      ...(shouldNotify && { notifiedAt: new Date() }),
    },
    include: { staff: true, project: { select: { name: true } }, location: { select: { name: true } } },
  });

  await syncGanttAssignmentToProjectOps(updated.id).catch(() => {});

  let notification = null;
  if (shouldNotify && updated.staff) {
    notification = await notifyGanttStaffAssignmentRecord(ctx.companyId, updated);
  }

  return NextResponse.json(
    ser({
      ...updated,
      notification,
      eventDatesExtended: dateGuard.ok && "extended" in dateGuard ? dateGuard.extended : false,
    }),
  );
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.ganttProjectStaff.findFirst({
    where: { id, project: { companyId: ctx.companyId } },
  });
  if (!existing) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  await deleteProjectOpsForGanttAssignment(id).catch(() => {});
  await prisma.ganttProjectStaff.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
