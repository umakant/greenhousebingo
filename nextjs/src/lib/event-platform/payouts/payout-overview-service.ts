import "server-only";

import { addDays, differenceInCalendarDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";

import { payoutOverviewDemo } from "@/lib/event-platform/payouts/payout-overview-demo";
import type {
  PayoutBatchRow,
  PayoutKpiBlock,
  PayoutOverviewPayload,
  PayoutStatusSlice,
  TopVendorPayout,
  UpcomingPayout,
} from "@/lib/event-platform/payouts/payout-overview-types";
import type { EpTrendMetric } from "@/lib/event-platform/dashboard-types";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  processing: "Processing",
  failed: "Failed",
  cancelled: "Cancelled",
};

const PAYOUT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  paypal: "PayPal",
  ach: "ACH",
  check: "Check",
};

function periodTrend(current: number, previous: number, suffix = "vs last month"): EpTrendMetric {
  if (previous === 0 && current === 0) {
    return { value: current, change: 0, changeLabel: `0% ${suffix}`, direction: "flat" };
  }
  if (previous === 0) {
    return { value: current, change: 100, changeLabel: `+100% ${suffix}`, direction: "up" };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  const sign = pct > 0 ? "+" : "";
  return {
    value: current,
    change: pct,
    changeLabel: `${sign}${pct}% ${suffix}`,
    direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
  };
}

function kpiAmount(amount: number, current: number, previous: number) {
  return { amount, ...periodTrend(current, previous) };
}

function formatPayoutMethod(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Bank Transfer";
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return PAYOUT_METHOD_LABELS[key] ?? raw;
}

function batchRow(
  row: {
    id: bigint;
    batchRef: string | null;
    createdAt: Date;
    totalAmount: { toString(): string };
    currency: string;
    status: string;
    vendor: { vendorName: string; payoutMethod: string | null };
  },
  vendorCount = 1,
): PayoutBatchRow {
  const created = row.createdAt;
  const periodStart = startOfMonth(created);
  const periodEnd = endOfMonth(created);
  return {
    id: row.id.toString(),
    batchId: row.batchRef ?? `PB-${row.id}`,
    dateCreated: created.toISOString().slice(0, 10),
    periodLabel: `${format(periodStart, "MMM d")} – ${format(periodEnd, "MMM d, yyyy")}`,
    vendorCount,
    amount: Number(row.totalAmount).toFixed(2),
    currency: row.currency,
    status: row.status,
    payoutMethod: formatPayoutMethod(row.vendor.payoutMethod),
  };
}

export async function getPayoutOverview(organizationId: bigint): Promise<PayoutOverviewPayload> {
  const payoutCount = await prisma.eventVendorPayout.count({ where: { organizationId } });
  if (payoutCount === 0) {
    return payoutOverviewDemo();
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const [
    allAgg,
    prevAgg,
    pendingAgg,
    pendingBatchCount,
    paidMonthAgg,
    paidMonthCount,
    vendorsPaidMonth,
    rows,
    statusGroups,
    vendorTotals,
    pendingBatches,
  ] = await Promise.all([
    prisma.eventVendorPayout.aggregate({
      where: { organizationId },
      _sum: { totalAmount: true },
    }),
    prisma.eventVendorPayout.aggregate({
      where: { organizationId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { totalAmount: true },
    }),
    prisma.eventVendorPayout.aggregate({
      where: { organizationId, status: "pending" },
      _sum: { totalAmount: true },
    }),
    prisma.eventVendorPayout.count({ where: { organizationId, status: "pending" } }),
    prisma.eventVendorPayout.aggregate({
      where: {
        organizationId,
        status: "paid",
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { totalAmount: true },
    }),
    prisma.eventVendorPayout.count({
      where: {
        organizationId,
        status: "paid",
        paidAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.eventVendorPayout.groupBy({
      by: ["vendorId"],
      where: {
        organizationId,
        status: "paid",
        paidAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.eventVendorPayout.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        vendor: { select: { vendorName: true, payoutMethod: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.eventVendorPayout.groupBy({
      by: ["status"],
      where: { organizationId },
      _sum: { totalAmount: true },
    }),
    prisma.eventVendorPayout.groupBy({
      by: ["vendorId"],
      where: { organizationId, status: "paid" },
      _sum: { totalAmount: true },
    }),
    prisma.eventVendorPayout.findMany({
      where: { organizationId, status: "pending" },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: { vendor: { select: { vendorName: true } } },
    }),
  ]);

  const totalAll = Number(allAgg._sum.totalAmount ?? 0);
  const totalPrev = Number(prevAgg._sum.totalAmount ?? 0);
  const pendingAmount = Number(pendingAgg._sum.totalAmount ?? 0);
  const paidMonthAmount = Number(paidMonthAgg._sum.totalAmount ?? 0);

  const kpis: PayoutKpiBlock = {
    totalPayouts: kpiAmount(totalAll, totalAll, totalPrev),
    pendingPayouts: {
      ...kpiAmount(pendingAmount, pendingAmount, pendingAmount),
      batchCount: pendingBatchCount,
      changeLabel: `${pendingBatchCount} batch${pendingBatchCount === 1 ? "" : "es"}`,
    },
    paidThisMonth: {
      ...kpiAmount(paidMonthAmount, paidMonthAmount, paidMonthAmount),
      payoutCount: paidMonthCount,
      changeLabel: `${paidMonthCount} payout${paidMonthCount === 1 ? "" : "s"}`,
    },
    vendorsPaid: {
      value: vendorsPaidMonth.length,
      count: vendorsPaidMonth.length,
      change: 0,
      changeLabel: "This month",
      direction: "flat",
    },
    nextPayout: (() => {
      const nextDate = addDays(now, 3);
      return {
        date: nextDate.toISOString().slice(0, 10),
        label: format(nextDate, "MMM d, yyyy"),
        daysRemaining: Math.max(0, differenceInCalendarDays(nextDate, now)),
      };
    })(),
  };

  const statusTotal = statusGroups.reduce((s, g) => s + Number(g._sum.totalAmount ?? 0), 0);
  const statusOverview: PayoutStatusSlice[] = statusGroups.map((g) => {
    const amount = Number(g._sum.totalAmount ?? 0);
    return {
      status: g.status,
      label: STATUS_LABELS[g.status.toLowerCase()] ?? g.status,
      amount,
      percent: statusTotal > 0 ? Math.round((amount / statusTotal) * 1000) / 10 : 0,
    };
  });

  const vendorTotalsSorted = [...vendorTotals]
    .sort((a, b) => Number(b._sum.totalAmount ?? 0) - Number(a._sum.totalAmount ?? 0))
    .slice(0, 5);

  const vendorIds = vendorTotalsSorted.map((v) => v.vendorId);
  const vendors = vendorIds.length
    ? await prisma.eventVendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, vendorName: true },
      })
    : [];
  const vendorNameMap = new Map(vendors.map((v) => [v.id.toString(), v.vendorName]));

  const topVendors: TopVendorPayout[] = vendorTotalsSorted.map((v, i) => ({
    rank: i + 1,
    vendorName: vendorNameMap.get(v.vendorId.toString()) ?? "Vendor",
    amount: Number(v._sum.totalAmount ?? 0).toFixed(2),
  }));

  const upcomingPayouts: UpcomingPayout[] = pendingBatches.map((p, i) => ({
    id: p.id.toString(),
    date: addDays(now, 7 + i * 14).toISOString().slice(0, 10),
    vendorCount: 1,
    amount: Number(p.totalAmount).toFixed(2),
    status: "scheduled",
  }));

  return {
    ok: true,
    isDemo: false,
    periodLabel: `${format(monthStart, "MMM d")} – ${format(monthEnd, "MMM d, yyyy")}`,
    kpis,
    batches: rows.map((r) => batchRow(r, Math.max(1, r._count.items))),
    batchTotal: payoutCount,
    statusOverview,
    statusTotal,
    topVendors,
    upcomingPayouts,
  };
}
