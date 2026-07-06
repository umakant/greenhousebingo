/**
 * Company invoices (revenue records) — lists accounting Revenue rows for the tenant (created_by = company).
 * Auth: superadmin + manage-users (same as company projects).
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  companyRouteForbidden,
  parseCompanyIdFromParam,
  requireSuperadminManageUsers,
  verifyCompanyTenant,
} from "@/lib/company-route-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSuperadminManageUsers(req))) return companyRouteForbidden();

  const { id } = await params;
  const companyId = parseCompanyIdFromParam(id);
  if (companyId == null) {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  const company = await verifyCompanyTenant(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const tenantId = companyId;

  const rows = await prisma.revenue.findMany({
    where: { createdBy: tenantId },
    orderBy: { date: "desc" },
    take: 500,
  });

  const customerIds = [...new Set(rows.map((r) => r.customerId).filter(Boolean))] as bigint[];
  const customers = customerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, companyName: true },
      })
    : [];
  const cMap = new Map(customers.map((c) => [c.id.toString(), c.companyName]));

  const invoices = rows.map((r) => ({
    id: r.id.toString(),
    reference_number: r.referenceNumber,
    date: r.date.toISOString().slice(0, 10),
    amount: r.amount.toString(),
    status: r.status,
    category: r.category,
    description: r.description,
    customer_name: r.customerId ? (cMap.get(r.customerId.toString()) ?? null) : null,
  }));

  return NextResponse.json({ invoices });
}
