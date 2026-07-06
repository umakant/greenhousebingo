import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-orders")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const orderId = BigInt(id);

  const order = await prisma.order.findFirst({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      planId: true,
      amount: true,
      status: true,
      paymentMethod: true,
      transactionId: true,
      metadata: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!order) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    order: {
      ...order,
      id: order.id.toString(),
      userId: order.userId?.toString?.() ?? null,
      planId: order.planId?.toString?.() ?? null,
      createdBy: order.createdBy?.toString?.() ?? null,
      amount: order.amount?.toString?.() ?? String(order.amount ?? "0"),
    },
  });
}

