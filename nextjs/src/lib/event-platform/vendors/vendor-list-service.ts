import "server-only";

import { subMonths } from "date-fns";
import { Prisma } from "@prisma/client";

import { readGlobalCommissionRate } from "@/lib/event-platform/dashboard-service";
import type {
  EventVendorListRow,
  EventVendorsListPayload,
  EventVendorsSummary,
} from "@/lib/event-platform/vendors/vendor-types";
import { listEventVendors, serializeEventVendor } from "@/lib/event-platform/vendors/vendor-service";
import { prisma } from "@/lib/prisma";

export async function getEventVendorsListPayload(organizationId: bigint): Promise<EventVendorsListPayload> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = subMonths(monthStart, 1);
  const prevMonthEnd = new Date(monthStart.getTime() - 1);

  const [vendors, globalRate, statusCounts, newThisMonth, commissionAll, commissionThisMonth, commissionPrevMonth, pendingPayoutAgg, pendingVendorGroups] =
    await Promise.all([
      listEventVendors(organizationId),
      readGlobalCommissionRate(organizationId),
      prisma.eventVendor.groupBy({
        by: ["status"],
        where: { organizationId, archivedAt: null },
        _count: { _all: true },
      }),
      prisma.eventVendor.count({
        where: { organizationId, archivedAt: null, createdAt: { gte: monthStart } },
      }),
      prisma.eventCommissionLedger.aggregate({
        where: { organizationId },
        _sum: { platformCommission: true },
      }),
      prisma.eventCommissionLedger.aggregate({
        where: { organizationId, createdAt: { gte: monthStart } },
        _sum: { platformCommission: true },
      }),
      prisma.eventCommissionLedger.aggregate({
        where: { organizationId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
        _sum: { platformCommission: true },
      }),
      prisma.eventCommissionLedger.aggregate({
        where: { organizationId, status: "pending" },
        _sum: { vendorNet: true },
      }),
      prisma.eventCommissionLedger.groupBy({
        by: ["vendorId"],
        where: { organizationId, status: "pending" },
        _sum: { vendorNet: true },
      }),
    ]);

  const vendorIds = vendors.map((v) => v.id);

  const [ledgerTotals, ledgerPending] = await Promise.all([
    vendorIds.length
      ? prisma.eventCommissionLedger.groupBy({
          by: ["vendorId"],
          where: { organizationId, vendorId: { in: vendorIds } },
          _sum: { grossAmount: true, platformCommission: true, vendorNet: true },
        })
      : Promise.resolve([]),
    vendorIds.length
      ? prisma.eventCommissionLedger.groupBy({
          by: ["vendorId"],
          where: { organizationId, vendorId: { in: vendorIds }, status: "pending" },
          _sum: { vendorNet: true },
        })
      : Promise.resolve([]),
  ]);

  const totalsByVendor = new Map(ledgerTotals.map((r) => [r.vendorId.toString(), r._sum]));
  const pendingByVendor = new Map(ledgerPending.map((r) => [r.vendorId.toString(), r._sum.vendorNet]));

  const totalVendors = statusCounts.reduce((s, r) => s + r._count._all, 0);
  const activeVendors = statusCounts.find((r) => r.status === "active")?._count._all ?? 0;
  const pendingVendors = statusCounts.find((r) => r.status === "pending")?._count._all ?? 0;

  const prevCommission = Number(commissionPrevMonth._sum.platformCommission ?? 0);
  const currCommission = Number(commissionThisMonth._sum.platformCommission ?? 0);
  const commissionTrendPercent =
    prevCommission > 0
      ? Math.round(((currCommission - prevCommission) / prevCommission) * 1000) / 10
      : currCommission > 0
        ? 100
        : 0;

  const summary: EventVendorsSummary = {
    totalVendors,
    activeVendors,
    pendingVendors,
    newVendorsThisMonth: newThisMonth,
    activePercent: totalVendors > 0 ? Math.round((activeVendors / totalVendors) * 1000) / 10 : 0,
    totalCommissionEarned: (commissionAll._sum.platformCommission ?? new Prisma.Decimal(0)).toString(),
    commissionTrendPercent,
    pendingPayoutAmount: (pendingPayoutAgg._sum.vendorNet ?? new Prisma.Decimal(0)).toString(),
    pendingPayoutVendorCount: pendingVendorGroups.length,
  };

  const items: EventVendorListRow[] = vendors
    .map((v) => {
      const base = serializeEventVendor(v);
      const totals = totalsByVendor.get(v.id.toString());
      const pending = pendingByVendor.get(v.id.toString()) ?? new Prisma.Decimal(0);
      const hasOverride = v.overrideCommissionRate != null;
      const rate = hasOverride
        ? Number(v.overrideCommissionRate)
        : v.defaultCommissionRate != null
          ? Number(v.defaultCommissionRate)
          : globalRate;

      let pendingPayoutStatus: "pending" | "hold" | "none" = "none";
      if (Number(pending) > 0) {
        pendingPayoutStatus = v.status === "suspended" ? "hold" : "pending";
      }

      return {
        ...base,
        commissionRate: rate.toFixed(rate % 1 === 0 ? 0 : 1),
        commissionPlan: hasOverride ? ("custom" as const) : ("default" as const),
        totalSales: (totals?.grossAmount ?? new Prisma.Decimal(0)).toString(),
        commissionEarned: (totals?.platformCommission ?? new Prisma.Decimal(0)).toString(),
        pendingPayout: pending.toString(),
        pendingPayoutStatus,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { summary, items };
}
