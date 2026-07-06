import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { prismaDateFromDateOnlyInput } from "@/lib/gantt-dates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const staffId = url.searchParams.get("staffId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const excludeId = url.searchParams.get("excludeId");

  if (!staffId || !startDate || !endDate) return NextResponse.json({ conflicts: [] });

  const where: Prisma.GanttProjectStaffWhereInput = {
    staffId,
    startDate: { lte: prismaDateFromDateOnlyInput(endDate) },
    endDate: { gte: prismaDateFromDateOnlyInput(startDate) },
  };
  if (excludeId) where.id = { not: excludeId };

  const conflicts = await prisma.ganttProjectStaff.findMany({
    where,
    include: { project: { select: { name: true } } },
  });
  return NextResponse.json({ conflicts });
}
