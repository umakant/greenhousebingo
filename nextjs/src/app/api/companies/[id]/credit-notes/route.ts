/**
 * Company credit notes — lists CreditNote rows for the tenant (created_by = company).
 * Auth: superadmin + manage-users (same as company invoices).
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

  const rows = await prisma.creditNote.findMany({
    where: { createdBy: tenantId },
    orderBy: { date: "desc" },
    take: 500,
  });

  const customerIds = [...new Set(rows.map((r) => r.customerId).filter(Boolean))] as bigint[];
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
          select: { id: true, companyName: true, contactPersonName: true },
        })
      : Promise.resolve([] as { id: bigint; companyName: string; contactPersonName: string }[]),
  ]);

  const nameById = new Map<string, string>();
  for (const u of users) {
    const label = (u.name?.trim() || u.email?.trim() || "").trim();
    if (label) nameById.set(u.id.toString(), label);
  }
  for (const c of customers) {
    const k = c.id.toString();
    if (!nameById.has(k)) {
      const label =
        c.companyName?.trim() ||
        c.contactPersonName?.trim() ||
        "";
      nameById.set(k, label || "—");
    }
  }

  const credit_notes = rows.map((r) => ({
    id: r.id.toString(),
    reference_number: r.referenceNumber,
    date: r.date.toISOString().slice(0, 10),
    amount: r.amount.toString(),
    status: r.status,
    reason: r.reason,
    notes: r.notes,
    customer_name: r.customerId ? (nameById.get(r.customerId.toString()) ?? "—") : null,
  }));

  return NextResponse.json({ credit_notes });
}
