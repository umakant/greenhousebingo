import { NextResponse, type NextRequest } from "next/server";

import { guardPartnerApi } from "@/lib/partner-api-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAID_ORDER_WHERE = {
  OR: [{ paymentStatus: "paid" }, { orderStatus: { in: ["paid", "scheduled"] } }],
};

/** Referred companies + their marketplace activity for the current partner. */
export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const companies = await prisma.user.findMany({
    where: { partnerId: guard.partner.id, type: { in: ["company", "company_admin"] } },
    select: { id: true, name: true, email: true, isActive: true, referralSource: true, referredAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const companyIds = companies.map((c) => c.id);
  const orders = companyIds.length
    ? await prisma.marketplaceOrder.findMany({
        where: { buyerOrganizationId: { in: companyIds }, ...PAID_ORDER_WHERE },
        select: { buyerOrganizationId: true, total: true, totalAmount: true, createdAt: true },
      })
    : [];

  const byCompany = new Map<string, { orders: number; revenue: number; lastOrderAt: Date | null }>();
  for (const o of orders) {
    const key = o.buyerOrganizationId.toString();
    const agg = byCompany.get(key) ?? { orders: 0, revenue: 0, lastOrderAt: null };
    agg.orders += 1;
    agg.revenue += o.totalAmount == null ? Number(o.total) : Number(o.totalAmount);
    if (!agg.lastOrderAt || o.createdAt > agg.lastOrderAt) agg.lastOrderAt = o.createdAt;
    byCompany.set(key, agg);
  }

  const items = companies.map((c) => {
    const agg = byCompany.get(c.id.toString());
    return {
      companyId: c.id.toString(),
      name: c.name,
      email: c.email,
      isActive: c.isActive !== false,
      referralSource: c.referralSource,
      referredAt: c.referredAt ? c.referredAt.toISOString() : null,
      marketplaceOrders: agg?.orders ?? 0,
      marketplaceRevenue: Math.round((agg?.revenue ?? 0) * 100) / 100,
      lastOrderAt: agg?.lastOrderAt ? agg.lastOrderAt.toISOString() : null,
    };
  });

  const totals = {
    companies: companies.length,
    activeBuyers: items.filter((i) => i.marketplaceOrders > 0).length,
    orders: orders.length,
    revenue: Math.round(items.reduce((s, i) => s + i.marketplaceRevenue, 0) * 100) / 100,
  };

  return NextResponse.json({ ok: true, totals, items });
}
