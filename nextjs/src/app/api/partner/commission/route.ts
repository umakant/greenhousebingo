import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnerApi } from "@/lib/partner-api-guard";

export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const [commissions, payouts] = await Promise.all([
    prisma.partnerCommission.findMany({
      where: { partnerId: guard.partner.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.partnerPayout.findMany({
      where: { partnerId: guard.partner.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  let earned = 0;
  let pending = 0;
  let paid = 0;
  for (const c of commissions) {
    const amt = Number(c.commissionAmount);
    earned += amt;
    if (c.status === "paid") paid += amt;
    else if (c.status === "pending" || c.status === "approved") pending += amt;
  }

  return NextResponse.json({
    ok: true,
    totals: { earned, pending, paid },
    commissions: commissions.map((c) => ({
      id: c.id.toString(),
      companyId: c.companyId.toString(),
      orderRef: c.orderRef,
      amount: Number(c.amount),
      commissionRate: Number(c.commissionRate),
      commissionAmount: Number(c.commissionAmount),
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    })),
    payouts: payouts.map((p) => ({
      id: p.id.toString(),
      totalAmount: Number(p.totalAmount),
      status: p.status,
      payoutReference: p.payoutReference,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
