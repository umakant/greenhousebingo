/**
 * Company payments — merged CustomerPayment + VendorPayment for the tenant (created_by = company).
 * Auth: superadmin + manage-users (same as company invoices).
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function requireSuperadminManageUsers(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return false;
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  return hasPermission(perms, "manage-users");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireSuperadminManageUsers(req)) return forbidden();

  const { id } = await params;
  const companyId = parseInt(id, 10);
  if (Number.isNaN(companyId))
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

  const company = await prisma.user.findFirst({
    where: { id: BigInt(companyId), type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const tenantId = BigInt(companyId);

  const [customerRows, vendorRows] = await Promise.all([
    prisma.customerPayment.findMany({
      where: { createdBy: tenantId },
      orderBy: { paymentDate: "desc" },
      take: 500,
    }),
    prisma.vendorPayment.findMany({
      where: { createdBy: tenantId },
      orderBy: { paymentDate: "desc" },
      take: 500,
    }),
  ]);

  const custIds = [...new Set(customerRows.map((r) => r.customerId))];
  const vendIds = [...new Set(vendorRows.map((r) => r.vendorId))];

  const [customers, vendors, users] = await Promise.all([
    custIds.length
      ? prisma.customer.findMany({
          where: { id: { in: custIds } },
          select: { id: true, companyName: true, contactPersonName: true },
        })
      : Promise.resolve([] as { id: bigint; companyName: string; contactPersonName: string }[]),
    vendIds.length
      ? prisma.vendor.findMany({
          where: { id: { in: vendIds } },
          select: { id: true, name: true, companyName: true },
        })
      : Promise.resolve([] as { id: bigint; name: string; companyName: string | null }[]),
    custIds.length
      ? prisma.user.findMany({
          where: { id: { in: custIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([] as { id: bigint; name: string | null; email: string | null }[]),
  ]);

  const custNameById = new Map<string, string>();
  for (const c of customers) {
    const label = c.companyName?.trim() || c.contactPersonName?.trim() || "";
    if (label) custNameById.set(c.id.toString(), label);
  }
  for (const u of users) {
    const k = u.id.toString();
    if (!custNameById.has(k)) {
      const label = (u.name?.trim() || u.email?.trim() || "").trim();
      if (label) custNameById.set(k, label);
    }
  }

  const vendNameById = new Map<string, string>();
  for (const v of vendors) {
    const label = v.companyName?.trim() || v.name?.trim() || "";
    vendNameById.set(v.id.toString(), label || "—");
  }

  type Row = {
    id: string;
    kind: "customer" | "vendor";
    reference_number: string;
    payment_date: string;
    amount: string;
    status: string;
    payment_method: string | null;
    party_name: string | null;
  };

  const fromCustomers: Row[] = customerRows.map((r) => ({
    id: `c-${r.id.toString()}`,
    kind: "customer" as const,
    reference_number: r.referenceNumber,
    payment_date: r.paymentDate.toISOString().slice(0, 10),
    amount: r.amount.toString(),
    status: r.status,
    payment_method: r.paymentMethod,
    party_name: custNameById.get(r.customerId.toString()) ?? "—",
  }));

  const fromVendors: Row[] = vendorRows.map((r) => ({
    id: `v-${r.id.toString()}`,
    kind: "vendor" as const,
    reference_number: r.referenceNumber,
    payment_date: r.paymentDate.toISOString().slice(0, 10),
    amount: r.amount.toString(),
    status: r.status,
    payment_method: r.paymentMethod,
    party_name: vendNameById.get(r.vendorId.toString()) ?? "—",
  }));

  const payments = [...fromCustomers, ...fromVendors].sort((a, b) => {
    if (a.payment_date !== b.payment_date) return b.payment_date.localeCompare(a.payment_date);
    return b.id.localeCompare(a.id);
  }).slice(0, 500);

  return NextResponse.json({ payments });
}
