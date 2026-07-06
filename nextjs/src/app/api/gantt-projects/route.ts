import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { formatGanttInputDate, prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";
import { syncMissingCompanyProjectsToGantt } from "@/lib/gantt-project-sync";
import { backfillGanttStaffAssignmentSchedules } from "@/lib/gantt-staff-assignment-backfill";

export const dynamic = "force-dynamic";

function ser(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return formatGanttInputDate(v.toISOString()) || v.toISOString();
  if (v !== null && typeof v === "object" && !Array.isArray(v))
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, ser(val)]));
  if (Array.isArray(v)) return v.map(ser);
  return v;
}

export async function GET(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;

  try {
    await syncMissingCompanyProjectsToGantt(ctx.companyId);
  } catch (e) {
    console.error("[gantt-projects] syncMissingCompanyProjectsToGantt failed", e);
  }
  try {
    await backfillGanttStaffAssignmentSchedules(ctx.companyId);
  } catch (e) {
    console.error("[gantt-projects] backfillGanttStaffAssignmentSchedules failed", e);
  }

  const where: Prisma.GanttProjectWhereInput = {
    companyId: ctx.companyId,
    NOT: { status: "Deleted" },
  };
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const projects = await prisma.ganttProject.findMany({
    where,
    orderBy: { createdAt: "asc" },
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
  });

  return NextResponse.json(ser(projects));
}

export async function POST(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!body.startDate || !body.endDate) return NextResponse.json({ error: "Start and end date required" }, { status: 400 });

  const project = await prisma.ganttProject.create({
    data: {
      name: body.name.trim(),
      startDate: prismaDateFromDateOnlyInput(body.startDate),
      endDate: prismaDateFromDateOnlyInput(body.endDate),
      color: body.color ?? "#3B82F6",
      clientId: body.clientId ?? null,
      projectRefId: body.projectRefId ? BigInt(body.projectRefId) : null,
      companyId: ctx.companyId,
      status: "active",
    },
  });

  return NextResponse.json(ser(project), { status: 201 });
}
