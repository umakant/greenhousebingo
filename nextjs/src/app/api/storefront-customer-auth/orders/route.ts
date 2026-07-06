import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { parseWebsiteId } from "@/lib/storefront-customer-auth";
import { getStorefrontCustomerFromRequest } from "@/lib/storefront-customer-api-guard";

export const dynamic = "force-dynamic";

/** Day 34 — Order history for the logged-in storefront customer (strict isolation). */
export async function GET(req: NextRequest) {
  const widRaw = req.nextUrl.searchParams.get("websiteId");
  if (widRaw == null || widRaw === "") {
    return NextResponse.json({ ok: false, message: "websiteId is required." }, { status: 400 });
  }
  const expected = parseWebsiteId(widRaw);
  if (expected == null) {
    return NextResponse.json({ ok: false, message: "Invalid websiteId." }, { status: 400 });
  }
  const ctx = await getStorefrontCustomerFromRequest(req, expected);
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const take = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "30") || 30));

  const rows = await prisma.storefrontOrder.findMany({
    where: {
      organizationId: ctx.organizationId,
      websiteId: ctx.websiteId,
      storefrontCustomerId: ctx.customerId,
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      total: true,
      currency: true,
      createdAt: true,
      paidAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    orders: rows.map((o) => ({
      id: o.id.toString(),
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      total: Number(o.total),
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
    })),
  });
}
