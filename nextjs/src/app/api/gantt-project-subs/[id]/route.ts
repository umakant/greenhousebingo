import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";
import { serializeAssignmentSchedule, type GanttDayScheduleEntry } from "@/lib/gantt-assignment-schedule";
import { prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";

export const dynamic = "force-dynamic";

function ser(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === "object" && !Array.isArray(v))
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, ser(val)]));
  if (Array.isArray(v)) return v.map(ser);
  return v;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.ganttProjectSub.update({
    where: { id },
    data: {
      ...(body.subId !== undefined && { subId: body.subId }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? prismaDateFromDateOnlyInput(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? prismaDateFromDateOnlyInput(body.endDate) : null }),
      ...(body.label !== undefined && { label: body.label }),
      ...(body.daySchedule !== undefined && {
        label: serializeAssignmentSchedule(body.daySchedule as GanttDayScheduleEntry[]),
      }),
    },
    include: { sub: true },
  });
  return NextResponse.json(ser(updated));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.ganttProjectSub.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
