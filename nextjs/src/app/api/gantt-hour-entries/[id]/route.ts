import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.ganttHourEntry.update({
    where: { id },
    data: {
      ...(body.hours !== undefined && { hours: body.hours }),
      ...(body.startTime !== undefined && { startTime: body.startTime }),
      ...(body.endTime !== undefined && { endTime: body.endTime }),
    },
  });
  const ser = (v: unknown): unknown => {
    if (typeof v === "bigint") return Number(v);
    if (v instanceof Date) return v.toISOString();
    if (v !== null && typeof v === "object" && !Array.isArray(v))
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, ser(val)]));
    if (Array.isArray(v)) return v.map(ser);
    return v;
  };
  return NextResponse.json(ser(updated));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.ganttHourEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
