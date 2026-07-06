import { NextResponse, type NextRequest } from "next/server";

import { guardPartnerApi } from "@/lib/partner-api-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAID_ORDER_WHERE = {
  OR: [{ paymentStatus: "paid" }, { orderStatus: { in: ["paid", "scheduled"] } }],
};

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Marketplace revenue analytics for the current partner (referred-company purchases). */
export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const companies = await prisma.user.findMany({
    where: { partnerId: guard.partner.id, type: { in: ["company", "company_admin"] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(companies.map((c) => [c.id.toString(), c.name] as const));
  const companyIds = companies.map((c) => c.id);

  const [orders, commissions] = await Promise.all([
    companyIds.length
      ? prisma.marketplaceOrder.findMany({
          where: { buyerOrganizationId: { in: companyIds }, ...PAID_ORDER_WHERE },
          select: { buyerOrganizationId: true, total: true, totalAmount: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.partnerCommission.findMany({
      where: { partnerId: guard.partner.id, sourceType: "marketplace" },
      select: { commissionAmount: true, status: true },
    }),
  ]);

  // Monthly revenue for the last 12 months.
  const months: { month: string; revenue: number; orders: number }[] = [];
  const now = new Date();
  const monthIndex = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = monthKey(d);
    monthIndex.set(key, months.length);
    months.push({ month: key, revenue: 0, orders: 0 });
  }

  let totalRevenue = 0;
  const byCompany = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const amount = o.totalAmount == null ? Number(o.total) : Number(o.totalAmount);
    totalRevenue += amount;
    const mk = monthKey(o.createdAt);
    const idx = monthIndex.get(mk);
    if (idx != null) {
      months[idx].revenue += amount;
      months[idx].orders += 1;
    }
    const key = o.buyerOrganizationId.toString();
    const agg = byCompany.get(key) ?? { revenue: 0, orders: 0 };
    agg.revenue += amount;
    agg.orders += 1;
    byCompany.set(key, agg);
  }

  const topCompanies = [...byCompany.entries()]
    .map(([companyId, agg]) => ({
      companyId,
      name: nameById.get(companyId) ?? "Company",
      revenue: Math.round(agg.revenue * 100) / 100,
      orders: agg.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  let commissionEarned = 0;
  let commissionPaid = 0;
  for (const c of commissions) {
    const amt = Number(c.commissionAmount);
    commissionEarned += amt;
    if (c.status === "paid") commissionPaid += amt;
  }

  return NextResponse.json({
    ok: true,
    totals: {
      revenue: Math.round(totalRevenue * 100) / 100,
      orders: orders.length,
      buyers: byCompany.size,
      referredCompanies: companies.length,
      commissionEarned: Math.round(commissionEarned * 100) / 100,
      commissionPaid: Math.round(commissionPaid * 100) / 100,
    },
    months: months.map((m) => ({ ...m, revenue: Math.round(m.revenue * 100) / 100 })),
    topCompanies,
  });
}
