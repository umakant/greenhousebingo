import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.ganttProject.findFirst({ where: { id, companyId: ctx.companyId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ser(project));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.ganttProject.findFirst({ where: { id, companyId: ctx.companyId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.ganttProject.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.clientId !== undefined && { clientId: body.clientId }),
      ...(body.projectRefId !== undefined && { projectRefId: body.projectRefId ? BigInt(body.projectRefId) : null }),
      ...(body.startDate !== undefined && { startDate: prismaDateFromDateOnlyInput(body.startDate) }),
      ...(body.endDate !== undefined && { endDate: prismaDateFromDateOnlyInput(body.endDate) }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });
  return NextResponse.json(ser(updated));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.ganttProject.findFirst({ where: { id, companyId: ctx.companyId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.ganttProject.update({ where: { id }, data: { status: "Deleted" } });
  return NextResponse.json({ success: true });
}
