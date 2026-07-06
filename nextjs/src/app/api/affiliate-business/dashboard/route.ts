import { NextResponse, type NextRequest } from "next/server";

import { requireAffiliateApiAccess, decimalToNumber } from "@/lib/affiliate-access";
import { ensureAffiliateDemoForOrg, isAffiliatePrismaReady } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function buildMonths(now: Date) {
  const months: { month: string; earned: number; paid: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      earned: 0,
      paid: 0,
    });
  }
  return months;
}

function buildYears(now: Date) {
  const years: { year: string; earned: number; paid: number }[] = [];
  const cy = now.getFullYear();
  for (let i = 5; i >= 0; i--) {
    years.push({ year: String(cy - i), earned: 0, paid: 0 });
  }
  return years;
}

export async function GET(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-business-dashboard");
  if (!gate.ok) return gate.response;

  const now = new Date();
  const { organizationId } = gate.actor;

  if (!isAffiliatePrismaReady()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Affiliate Business database models are not loaded. Run `npx prisma generate` in the nextjs folder, then restart the dev server.",
      },
      { status: 503 },
    );
  }

  await ensureAffiliateDemoForOrg(organizationId);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const earliestYearStart = new Date(now.getFullYear() - 5, 0, 1);
  const paidThisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    partners,
    programs,
    commissions,
    payouts,
    pendingAgg,
    pendingPayoutAgg,
    paidThisMonth,
    recentCommissions,
  ] = await Promise.all([
    prisma.affiliatePartner.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        tier: true,
        status: true,
        totalClicks: true,
        totalConversions: true,
        lifetimeEarnings: true,
        joinedAt: true,
      },
      orderBy: { lifetimeEarnings: "desc" },
    }),
    prisma.affiliateProgram.findMany({
      where: { organizationId },
      select: { id: true, status: true },
    }),
    prisma.affiliateCommission.findMany({
      where: { organizationId },
      select: { amount: true, status: true, earnedAt: true },
    }),
    prisma.affiliatePayout.findMany({
      where: { organizationId },
      select: { amount: true, status: true, scheduledAt: true, paidAt: true },
    }),
    prisma.affiliateCommission.aggregate({
      where: { organizationId, status: "pending" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.affiliatePayout.aggregate({
      where: { organizationId, status: { in: ["scheduled", "processing"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.affiliatePayout.aggregate({
      where: { organizationId, status: "paid", paidAt: { gte: paidThisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.affiliateCommission.findMany({
      where: { organizationId },
      orderBy: { earnedAt: "desc" },
      take: 8,
      include: {
        partner: { select: { id: true, name: true, referralCode: true } },
        program: { select: { id: true, name: true } },
      },
    }),
  ]);

  const activePartners = partners.filter((p) => p.status === "active").length;
  const pendingPartners = partners.filter((p) => p.status === "pending").length;
  const suspendedPartners = partners.filter((p) => p.status === "suspended").length;
  const activePrograms = programs.filter((p) => p.status === "active").length;

  const totalClicks = partners.reduce((s, p) => s + p.totalClicks, 0);
  const totalConversions = partners.reduce((s, p) => s + p.totalConversions, 0);
  const conversionRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 1000) / 10 : 0;

  const approvedPaid = commissions.filter((c) => c.status === "approved" || c.status === "paid");
  const totalEarned = approvedPaid.reduce((s, c) => s + decimalToNumber(c.amount), 0);

  const statusCounts: Record<string, number> = {
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
  };
  for (const c of commissions) {
    const k = c.status.toLowerCase();
    if (k in statusCounts) statusCounts[k]++;
    else statusCounts.pending++;
  }

  const months = buildMonths(now);
  for (const c of commissions) {
    if (c.earnedAt < sixMonthsAgo) continue;
    const label = c.earnedAt.toLocaleDateString("en-US", { month: "short" });
    const m = months.find((mo) => mo.month === label);
    if (m && (c.status === "approved" || c.status === "paid")) {
      m.earned += decimalToNumber(c.amount);
    }
  }
  for (const p of payouts) {
    const dt = p.paidAt ?? p.scheduledAt;
    if (dt < sixMonthsAgo || p.status !== "paid") continue;
    const label = dt.toLocaleDateString("en-US", { month: "short" });
    const m = months.find((mo) => mo.month === label);
    if (m) m.paid += decimalToNumber(p.amount);
  }

  const years = buildYears(now);
  for (const c of commissions) {
    if (c.earnedAt < earliestYearStart) continue;
    const y = String(c.earnedAt.getFullYear());
    const row = years.find((yr) => yr.year === y);
    if (row && (c.status === "approved" || c.status === "paid")) {
      row.earned += decimalToNumber(c.amount);
    }
  }
  for (const p of payouts) {
    const dt = p.paidAt ?? p.scheduledAt;
    if (dt < earliestYearStart || p.status !== "paid") continue;
    const y = String(dt.getFullYear());
    const row = years.find((yr) => yr.year === y);
    if (row) row.paid += decimalToNumber(p.amount);
  }

  const partnerPerformance = partners
    .filter((p) => p.status === "active")
    .map((p) => {
      const rate = p.totalClicks > 0 ? Math.round((p.totalConversions / p.totalClicks) * 100) : 0;
      return {
        name: p.name,
        total_clicks: p.totalClicks,
        total_conversions: p.totalConversions,
        conversion_rate: rate,
        lifetime_earnings: decimalToNumber(p.lifetimeEarnings),
      };
    })
    .filter((p) => p.total_clicks > 0 || p.lifetime_earnings > 0)
    .sort((a, b) => b.lifetime_earnings - a.lifetime_earnings)
    .slice(0, 6);

  const recentPartners = partners.slice(0, 5).map((p) => ({
    id: p.id.toString(),
    name: p.name,
    email: p.email,
    referral_code: p.referralCode,
    tier: p.tier,
    status: p.status,
    total_conversions: p.totalConversions,
    lifetime_earnings: decimalToNumber(p.lifetimeEarnings),
    joined_at: p.joinedAt.toISOString(),
  }));

  return NextResponse.json({
    ok: true,
    stats: {
      active_partners: activePartners,
      active_programs: activePrograms,
      pending_commission_total: decimalToNumber(pendingAgg._sum.amount),
      pending_commission_count: pendingAgg._count,
      pending_payout_total: decimalToNumber(pendingPayoutAgg._sum.amount),
      pending_payout_count: pendingPayoutAgg._count,
      payouts_this_month: decimalToNumber(paidThisMonth._sum.amount),
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      conversion_rate: conversionRate,
      total_earned: totalEarned,
    },
    monthlyProgress: months,
    yearlyProgress: years,
    commissionStatus: [
      { name: "Pending", value: statusCounts.pending, color: "#f59e0b" },
      { name: "Approved", value: statusCounts.approved, color: "#3b82f6" },
      { name: "Paid", value: statusCounts.paid, color: "#10b981" },
      { name: "Rejected", value: statusCounts.rejected, color: "#ef4444" },
    ],
    partnerStatus: [
      { name: "Active", value: activePartners, color: "#10b981" },
      { name: "Pending", value: pendingPartners, color: "#f59e0b" },
      { name: "Suspended", value: suspendedPartners, color: "#ef4444" },
    ],
    partnerPerformance,
    recentCommissions: recentCommissions.map((c) => ({
      id: c.id.toString(),
      order_ref: c.orderRef,
      amount: decimalToNumber(c.amount),
      status: c.status,
      earned_at: c.earnedAt.toISOString(),
      partner_name: c.partner.name,
      program_name: c.program.name,
      referral_code: c.partner.referralCode,
    })),
    recentPartners,
  });
}
