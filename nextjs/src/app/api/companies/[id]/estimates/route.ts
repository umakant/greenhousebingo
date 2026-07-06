/**
 * Company estimates — lists SalesProposal rows for the tenant (created_by = company).
 * Auth: superadmin + manage-users (same as company projects / invoices).
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

  const rows = await prisma.salesProposal.findMany({
    where: { createdBy: tenantId },
    orderBy: { proposalDate: "desc" },
    take: 500,
  });

  const customerIds = [...new Set(rows.map((r) => r.customerId))];
  const [users, customers] = await Promise.all([
    customerIds.length
      ? prisma.user.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([] as { id: bigint; name: string | null; email: string | null }[]),
    customerIds.length
      ? prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, companyName: true },
        })
      : Promise.resolve([] as { id: bigint; companyName: string }[]),
  ]);

  const nameById = new Map<string, string>();
  for (const u of users) {
    const label = (u.name?.trim() || u.email?.trim() || "").trim();
    if (label) nameById.set(u.id.toString(), label);
  }
  for (const c of customers) {
    const k = c.id.toString();
    if (!nameById.has(k)) {
      const label = c.companyName?.trim() || "";
      nameById.set(k, label || "—");
    }
  }

  const estimates = rows.map((r) => ({
    id: r.id.toString(),
    proposal_number: r.proposalNumber,
    proposal_date: r.proposalDate.toISOString().slice(0, 10),
    due_date: r.dueDate.toISOString().slice(0, 10),
    total_amount: r.totalAmount.toString(),
    status: r.status,
    converted_to_invoice: r.convertedToInvoice,
    customer_name: nameById.get(r.customerId.toString()) ?? "—",
  }));

  return NextResponse.json({ estimates });
}
