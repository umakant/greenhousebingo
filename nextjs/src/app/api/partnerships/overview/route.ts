import { NextResponse, type NextRequest } from "next/server";

import { decimalToNumber, roundOwnership } from "@/lib/brand-ownership-service";
import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";

export async function GET(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const [
    totalPartners,
    activePartners,
    pendingApplications,
    referredCompanies,
    commissions,
    pendingPayouts,
    totalBrands,
    activeBrands,
    totalOwnershipHolders,
    pendingOwnershipRequests,
    brandRows,
  ] = await Promise.all([
    prisma.partner.count(),
    prisma.partner.count({ where: { status: "active" } }),
    prisma.partner.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { partnerId: { not: null }, type: { in: ["company", "company_admin"] } } }),
    prisma.partnerCommission.findMany({ select: { status: true, commissionAmount: true } }),
    prisma.partnerPayout.findMany({
      where: { status: { in: ["pending", "processing"] } },
      select: { totalAmount: true },
    }),
    prisma.ownershipBrand.count(),
    prisma.ownershipBrand.count({ where: { status: "active" } }),
    prisma.ownershipBrandHolder.count({ where: { status: "active" } }),
    prisma.ownershipBrandRequest.count({ where: { status: "pending" } }),
    prisma.ownershipBrand.findMany({
      orderBy: { name: "asc" },
      take: 8,
      include: {
        holders: {
          where: { status: "active" },
          select: { currentOwnershipPercent: true },
        },
      },
    }),
  ]);

  let totalCommission = 0;
  let pendingCommission = 0;
  let paidCommission = 0;
  for (const c of commissions) {
    const amt = Number(c.commissionAmount);
    totalCommission += amt;
    if (c.status === "paid") paidCommission += amt;
    else if (c.status === "pending" || c.status === "approved") pendingCommission += amt;
  }
  const pendingPayoutTotal = pendingPayouts.reduce((s, p) => s + Number(p.totalAmount), 0);

  const brands = brandRows.map((b) => {
    const totalOwnership = roundOwnership(
      b.holders.reduce((sum, h) => sum + decimalToNumber(h.currentOwnershipPercent), 0),
    );
    return {
      id: b.id.toString(),
      name: b.name,
      status: b.status,
      holderCount: b.holders.length,
      totalOwnership,
      availableOwnership: roundOwnership(Math.max(0, 100 - totalOwnership)),
    };
  });

  const avgBrandOwnership =
    brands.length > 0
      ? Math.round(brands.reduce((sum, b) => sum + b.totalOwnership, 0) / brands.length)
      : 0;

  return NextResponse.json({
    ok: true,
    stats: {
      totalPartners,
      activePartners,
      pendingApplications,
      referredCompanies,
      totalCommission,
      pendingCommission,
      paidCommission,
      pendingPayoutTotal,
      totalBrands,
      activeBrands,
      totalOwnershipHolders,
      pendingOwnershipRequests,
      avgBrandOwnership,
    },
    brands,
  });
}
