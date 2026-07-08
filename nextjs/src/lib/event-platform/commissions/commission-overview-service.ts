import "server-only";

import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Prisma } from "@prisma/client";

import { commissionOverviewDemo } from "@/lib/event-platform/commissions/commission-overview-demo";
import type {
  CommissionKpiBlock,
  CommissionLedgerRow,
  CommissionOverviewPayload,
  CommissionRuleRow,
  CommissionTrendPoint,
  CommissionVendorPlanRow,
} from "@/lib/event-platform/commissions/commission-overview-types";
import type { EpTrendMetric } from "@/lib/event-platform/dashboard-types";
import { readGlobalCommissionRate } from "@/lib/event-platform/dashboard-service";
import { prisma } from "@/lib/prisma";

function periodTrend(current: number, previous: number): EpTrendMetric {
  if (previous === 0 && current === 0) {
    return { value: current, change: 0, changeLabel: "0% vs previous period", direction: "flat" };
  }
  if (previous === 0) {
    return {
      value: current,
      change: 100,
      changeLabel: `+100% vs previous period`,
      direction: "up",
    };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  const sign = pct > 0 ? "+" : "";
  return {
    value: current,
    change: pct,
    changeLabel: `${sign}${pct}% vs previous period`,
    direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
  };
}

function kpi(amount: number, current: number, previous: number) {
  return { amount, ...periodTrend(current, previous) };
}

function monthKey(d: Date): string {
  return format(d, "MMM yyyy");
}

function ledgerRowFromDb(
  row: Prisma.EventCommissionLedgerGetPayload<{
    include: { vendor: { select: { vendorName: true } } };
  }>,
  eventTitle?: string | null,
): CommissionLedgerRow {
  const gross = Number(row.grossAmount);
  const platform = Number(row.platformCommission);
  const pct = gross > 0 ? Math.round((platform / gross) * 1000) / 10 : 0;
  return {
    id: row.id.toString(),
    date: row.createdAt.toISOString().slice(0, 10),
    bookingId: row.registrationId ? `BK-${row.registrationId}` : `TX-${row.id}`,
    eventTitle: eventTitle ?? "Event booking",
    vendorName: row.vendor.vendorName,
    grossAmount: gross.toFixed(2),
    commissionPercent: String(pct),
    platformCommission: platform.toFixed(2),
    vendorNet: Number(row.vendorNet).toFixed(2),
    currency: row.currency,
    status: row.status,
  };
}

export async function getCommissionOverview(organizationId: bigint): Promise<CommissionOverviewPayload> {
  const globalCommissionRate = await readGlobalCommissionRate(organizationId);
  const ledgerCount = await prisma.eventCommissionLedger.count({ where: { organizationId } });

  if (ledgerCount === 0) {
    return commissionOverviewDemo(globalCommissionRate);
  }

  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevEnd = endOfMonth(subMonths(now, 1));
  const chartStart = subMonths(now, 5);
  chartStart.setDate(1);
  chartStart.setHours(0, 0, 0, 0);

  const [
    currentAgg,
    prevAgg,
    paidAgg,
    pendingAgg,
    refundedAgg,
    prevPaidAgg,
    prevPendingAgg,
    chartRows,
    recentRows,
    vendors,
    rules,
  ] = await Promise.all([
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, createdAt: { gte: periodStart, lte: periodEnd } },
      _sum: { grossAmount: true, platformCommission: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { grossAmount: true, platformCommission: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, status: "paid", createdAt: { gte: periodStart, lte: periodEnd } },
      _sum: { platformCommission: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, status: "pending", createdAt: { gte: periodStart, lte: periodEnd } },
      _sum: { platformCommission: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, status: "refunded", createdAt: { gte: periodStart, lte: periodEnd } },
      _sum: { platformCommission: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, status: "paid", createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { platformCommission: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, status: "pending", createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { platformCommission: true },
    }),
    prisma.eventCommissionLedger.findMany({
      where: { organizationId, createdAt: { gte: chartStart } },
      select: { grossAmount: true, platformCommission: true, createdAt: true },
    }),
    prisma.eventCommissionLedger.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { vendor: { select: { vendorName: true } } },
    }),
    prisma.eventVendor.findMany({
      where: { organizationId },
      orderBy: { vendorName: "asc" },
      take: 20,
      include: {
        _count: { select: { commissionRules: true } },
      },
    }),
    prisma.eventVendorCommissionRule.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { vendor: { select: { vendorName: true } } },
    }),
  ]);

  const eventIds = [...new Set(recentRows.map((r) => r.eventId).filter((id): id is bigint => id != null))];
  const events =
    eventIds.length > 0
      ? await prisma.lmsTrainingEvent.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true },
        })
      : [];
  const eventTitleMap = new Map(events.map((e) => [e.id.toString(), e.title]));

  const ruleEventIds = [...new Set(rules.map((r) => r.eventId).filter((id): id is bigint => id != null))];
  const ruleEvents =
    ruleEventIds.length > 0
      ? await prisma.lmsTrainingEvent.findMany({
          where: { id: { in: ruleEventIds } },
          select: { id: true, title: true },
        })
      : [];
  const ruleEventMap = new Map(ruleEvents.map((e) => [e.id.toString(), e.title]));

  const grossCurrent = Number(currentAgg._sum.grossAmount ?? 0);
  const grossPrev = Number(prevAgg._sum.grossAmount ?? 0);
  const platformCurrent = Number(currentAgg._sum.platformCommission ?? 0);
  const platformPrev = Number(prevAgg._sum.platformCommission ?? 0);
  const paidCurrent = Number(paidAgg._sum.platformCommission ?? 0);
  const paidPrev = Number(prevPaidAgg._sum.platformCommission ?? 0);
  const pendingCurrent = Number(pendingAgg._sum.platformCommission ?? 0);
  const pendingPrev = Number(prevPendingAgg._sum.platformCommission ?? 0);
  const refundedCurrent = Number(refundedAgg._sum.platformCommission ?? 0);

  const kpis: CommissionKpiBlock = {
    grossSales: kpi(grossCurrent, grossCurrent, grossPrev),
    platformCommission: kpi(platformCurrent, platformCurrent, platformPrev),
    paidCommission: kpi(paidCurrent, paidCurrent, paidPrev),
    pendingCommission: kpi(pendingCurrent, pendingCurrent, pendingPrev),
    refundedCommission: kpi(refundedCurrent, refundedCurrent, refundedCurrent),
  };

  const trendMap = new Map<string, { grossSales: number; platformCommission: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    trendMap.set(monthKey(d), { grossSales: 0, platformCommission: 0 });
  }
  for (const row of chartRows) {
    const key = monthKey(row.createdAt);
    const bucket = trendMap.get(key);
    if (!bucket) continue;
    bucket.grossSales += Number(row.grossAmount);
    bucket.platformCommission += Number(row.platformCommission);
  }
  const trend: CommissionTrendPoint[] = [...trendMap.entries()].map(([month, v]) => ({
    month,
    grossSales: Math.round(v.grossSales * 100) / 100,
    platformCommission: Math.round(v.platformCommission * 100) / 100,
  }));

  const vendorPlans: CommissionVendorPlanRow[] = await Promise.all(
    vendors.map(async (v) => {
      const earned = await prisma.eventCommissionLedger.aggregate({
        where: { organizationId, vendorId: v.id },
        _sum: { platformCommission: true },
      });
      const rate =
        v.overrideCommissionRate != null
          ? Number(v.overrideCommissionRate)
          : v.defaultCommissionRate != null
            ? Number(v.defaultCommissionRate)
            : globalCommissionRate;
      return {
        id: v.id.toString(),
        vendorName: v.vendorName,
        planType: v.overrideCommissionRate != null ? ("custom" as const) : ("default" as const),
        commissionRate: rate.toFixed(rate % 1 === 0 ? 0 : 1),
        eventsCount: v._count.commissionRules,
        earnedToDate: Number(earned._sum.platformCommission ?? 0).toFixed(2),
      };
    }),
  );

  const commissionRules: CommissionRuleRow[] = rules.map((r) => ({
    id: r.id.toString(),
    eventTitle: r.eventId ? (ruleEventMap.get(r.eventId.toString()) ?? `Event #${r.eventId}`) : "All events",
    vendorName: r.vendor?.vendorName ?? "—",
    commissionRate: Number(r.commissionRate).toFixed(Number(r.commissionRate) % 1 === 0 ? 0 : 1),
    isActive: r.isActive,
  }));

  return {
    ok: true,
    isDemo: false,
    globalCommissionRate,
    periodLabel: `${format(periodStart, "MMM d")} – ${format(periodEnd, "MMM d, yyyy")}`,
    kpis,
    trend,
    recentLedger: recentRows.map((r) =>
      ledgerRowFromDb(r, r.eventId ? eventTitleMap.get(r.eventId.toString()) : null),
    ),
    ledgerTotal: ledgerCount,
    vendorPlans,
    commissionRules,
  };
}
