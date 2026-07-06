import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";
import { prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";
import { buildGanttLocationAddressData } from "@/lib/gantt-location-address";

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
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const project = await prisma.ganttProject.findFirst({ where: { id: body.projectId, companyId: ctx.companyId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const location = await prisma.ganttProjectLocation.create({
    data: {
      projectId: body.projectId,
      name: body.name.trim(),
      color: body.color ?? "#6366F1",
      startDate: body.startDate ? prismaDateFromDateOnlyInput(body.startDate) : null,
      endDate: body.endDate ? prismaDateFromDateOnlyInput(body.endDate) : null,
      showLocationMap: body.showLocationMap === true,
      ...buildGanttLocationAddressData(body),
    },
  });
  return NextResponse.json(ser(location), { status: 201 });
}
