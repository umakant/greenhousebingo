/**
 * Company contacts — lists Customer (accounting) rows for the tenant (created_by = company).
 * Auth: superadmin + manage-users (same as company payments).
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

  const rows = await prisma.customer.findMany({
    where: { createdBy: tenantId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      customerCode: true,
      companyName: true,
      contactPersonName: true,
      contactPersonEmail: true,
      contactPersonMobile: true,
      taxNumber: true,
      createdAt: true,
    },
  });

  const contacts = rows.map((r) => ({
    id: r.id.toString(),
    customer_code: r.customerCode,
    company_name: r.companyName,
    contact_person_name: r.contactPersonName,
    contact_person_email: r.contactPersonEmail,
    contact_person_mobile: r.contactPersonMobile,
    tax_number: r.taxNumber,
    created_at: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ contacts });
}
