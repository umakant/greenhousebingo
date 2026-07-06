/**
 * Company subscription / SaaS orders — Order rows with created_by = company tenant.
 * Auth: superadmin + manage-users.
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

  const rows = await prisma.order.findMany({
    where: { createdBy: tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      orderId: true,
      planName: true,
      amount: true,
      price: true,
      currency: true,
      paymentStatus: true,
      paymentType: true,
      status: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  const orders = rows.map((r) => {
    const amt = r.price != null ? r.price : r.amount;
    return {
      id: r.id.toString(),
      order_id: r.orderId,
      plan_name: r.planName,
      customer_name: r.name,
      customer_email: r.email,
      amount: amt.toString(),
      currency: (r.currency ?? "USD").trim() || "USD",
      payment_status: r.paymentStatus,
      payment_type: r.paymentType,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ orders });
}
