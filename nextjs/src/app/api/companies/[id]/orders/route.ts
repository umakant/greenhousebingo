/**
 * Company subscription / SaaS orders — Order rows with created_by = company tenant.
 * Auth: superadmin + manage-users.
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
