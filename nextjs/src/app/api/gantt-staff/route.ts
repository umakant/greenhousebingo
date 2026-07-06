import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";
import { syncGanttStaffForCompany } from "@/lib/sync-gantt-staff";

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

  const all = await syncGanttStaffForCompany(ctx.companyId, ctx.companyBigId);
  return NextResponse.json(ser(all));
}

export async function POST(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const staff = await prisma.ganttStaff.create({
    data: { name: body.name.trim(), email: body.email ?? null, color: body.color ?? "#3B82F6", companyId: ctx.companyId },
  });
  return NextResponse.json(ser(staff), { status: 201 });
}
