import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";
import type { Prisma } from "@prisma/client";
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

export async function GET(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const assignmentId = url.searchParams.get("assignmentId");
  const companyScope = url.searchParams.get("companyScope") === "1";

  const where: Prisma.GanttHourEntryWhereInput = {};
  if (projectId) where.projectId = projectId;
  if (assignmentId) where.assignmentId = assignmentId;
  if (companyScope && !projectId) {
    const projectIds = await prisma.ganttProject.findMany({
      where: { companyId: ctx.companyId, NOT: { status: "Deleted" } },
      select: { id: true },
    });
    where.projectId = { in: projectIds.map((p) => p.id) };
  }

  const entries = await prisma.ganttHourEntry.findMany({
    where,
    orderBy: { date: "asc" },
  });
  return NextResponse.json(ser(entries));
}

export async function POST(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const entry = await prisma.ganttHourEntry.create({
    data: {
      projectId: body.projectId,
      assignmentId: body.assignmentId,
      assignmentType: body.assignmentType,
      date: prismaDateFromDateOnlyInput(body.date),
      hours: body.hours,
      startTime: body.startTime ?? null,
      endTime: body.endTime ?? null,
    },
  });
  return NextResponse.json(ser(entry), { status: 201 });
}
