import { NextResponse, type NextRequest } from "next/server";

import { guardPartnerApi } from "@/lib/partner-api-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Marketplace-source commissions for the current partner (separate from subscription commissions). */
export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const commissions = await prisma.partnerCommission.findMany({
    where: { partnerId: guard.partner.id, sourceType: "marketplace" },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const companyIds = [...new Set(commissions.map((c) => c.companyId))];
  const companies = companyIds.length
    ? await prisma.user.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(companies.map((c) => [c.id.toString(), c.name] as const));

  let earned = 0;
  let pending = 0;
  let paid = 0;
  for (const c of commissions) {
    const amt = Number(c.commissionAmount);
    earned += amt;
    if (c.status === "paid") paid += amt;
    else pending += amt;
  }

  return NextResponse.json({
    ok: true,
    totals: {
      earned: Math.round(earned * 100) / 100,
      pending: Math.round(pending * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      count: commissions.length,
    },
    commissions: commissions.map((c) => ({
      id: c.id.toString(),
      companyId: c.companyId.toString(),
      companyName: nameById.get(c.companyId.toString()) ?? null,
      marketplaceOrderId: c.marketplaceOrderId ? c.marketplaceOrderId.toString() : null,
      orderRef: c.orderRef,
      amount: Number(c.amount),
      commissionRate: Number(c.commissionRate),
      // rate 0 on a marketplace commission means a flat-amount rule was applied.
      commissionType: Number(c.commissionRate) > 0 ? "percentage" : "flat",
      commissionAmount: Number(c.commissionAmount),
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    })),
  });
}
