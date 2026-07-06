import { NextResponse, type NextRequest } from "next/server";

import { requireAffiliateApiAccess, decimalToNumber } from "@/lib/affiliate-access";
import { ensureAffiliateDemoForOrg } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-analytics");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureAffiliateDemoForOrg(organizationId);

  const [byStatus, byProgram, monthly, clicks] = await Promise.all([
    prisma.affiliateCommission.groupBy({
      by: ["status"],
      where: { organizationId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.affiliateCommission.groupBy({
      by: ["programId"],
      where: { organizationId, status: { in: ["approved", "paid"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.affiliateCommission.findMany({
      where: {
        organizationId,
        earnedAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
      select: { amount: true, earnedAt: true },
      orderBy: { earnedAt: "asc" },
    }),
    prisma.affiliatePartner.aggregate({
      where: { organizationId },
      _sum: { totalClicks: true, totalConversions: true },
    }),
  ]);

  const programIds = byProgram.map((r) => r.programId);
  const programNames =
    programIds.length > 0
      ? await prisma.affiliateProgram.findMany({
          where: { id: { in: programIds } },
          select: { id: true, name: true },
        })
      : [];
  const nameById = new Map(programNames.map((p) => [p.id.toString(), p.name]));

  const monthMap = new Map<string, number>();
  for (const row of monthly) {
    const key = `${row.earnedAt.getFullYear()}-${String(row.earnedAt.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + decimalToNumber(row.amount));
  }

  const conversionRate =
    (clicks._sum.totalClicks ?? 0) > 0
      ? Math.round(((clicks._sum.totalConversions ?? 0) / (clicks._sum.totalClicks ?? 1)) * 1000) / 10
      : 0;

  return NextResponse.json({
    ok: true,
    summary: {
      totalClicks: clicks._sum.totalClicks ?? 0,
      totalConversions: clicks._sum.totalConversions ?? 0,
      conversionRate,
    },
    commissionsByStatus: byStatus.map((r) => ({
      status: r.status,
      count: r._count,
      total: decimalToNumber(r._sum.amount),
    })),
    commissionsByProgram: byProgram.map((r) => ({
      programId: r.programId.toString(),
      programName: nameById.get(r.programId.toString()) ?? "Unknown",
      count: r._count,
      total: decimalToNumber(r._sum.amount),
    })),
    monthlyEarnings: Array.from(monthMap.entries()).map(([month, total]) => ({ month, total })),
  });
}
