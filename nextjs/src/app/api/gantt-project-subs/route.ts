import { NextResponse, type NextRequest } from "next/server";
import {
  serializeAssignmentSchedule,
  type GanttDayScheduleEntry,
} from "@/lib/gantt-assignment-schedule";
import { prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";
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

  let startDate = body.startDate ? prismaDateFromDateOnlyInput(body.startDate) : null;
  let endDate = body.endDate ? prismaDateFromDateOnlyInput(body.endDate) : null;
  if (!startDate || !endDate) {
    let loc: { startDate: Date | null; endDate: Date | null } | null = null;
    if (body.locationId) {
      loc = await prisma.ganttProjectLocation.findFirst({
        where: { id: body.locationId, projectId: body.projectId },
        select: { startDate: true, endDate: true },
      });
    }
    if (!startDate) startDate = loc?.startDate ?? project.startDate;
    if (!endDate) endDate = loc?.endDate ?? project.endDate;
  }

  const label =
    body.daySchedule !== undefined
      ? serializeAssignmentSchedule(body.daySchedule as GanttDayScheduleEntry[])
      : body.label ?? "";

  const assignment = await prisma.ganttProjectSub.create({
    data: {
      projectId: body.projectId,
      locationId: body.locationId ?? null,
      subId: body.subId ?? null,
      label,
      startDate,
      endDate,
    },
    include: { sub: true },
  });
  return NextResponse.json(ser(assignment), { status: 201 });
}
