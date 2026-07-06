import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGanttCompanyFromRequest } from "@/lib/gantt-api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await resolveGanttCompanyFromRequest(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.customer.findMany({
    where: { createdBy: ctx.companyBigId },
    select: { id: true, companyName: true, contactPersonName: true, customerCode: true },
    orderBy: { companyName: "asc" },
  });

  const result = customers.map(c => ({
    id: String(c.id),
    name: c.companyName,
    contactPerson: c.contactPersonName,
    code: c.customerCode,
  }));

  return NextResponse.json(result);
}
