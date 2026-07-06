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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const location = await prisma.ganttProjectLocation.findUnique({
    where: { id },
    include: { project: { select: { companyId: true } } },
  });
  if (!location || location.project.companyId !== ctx.companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.ganttProjectLocation.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? prismaDateFromDateOnlyInput(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? prismaDateFromDateOnlyInput(body.endDate) : null }),
      ...(body.showLocationMap !== undefined && { showLocationMap: body.showLocationMap === true }),
      ...buildGanttLocationAddressData(body),
    },
  });
  return NextResponse.json(ser(updated));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const location = await prisma.ganttProjectLocation.findUnique({
    where: { id },
    include: { project: { select: { companyId: true } } },
  });
  if (!location || location.project.companyId !== ctx.companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.ganttProjectLocation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
