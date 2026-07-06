import { NextResponse, type NextRequest } from "next/server";
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, subDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";

const STATUS_COLORS: Record<string, string> = {
  paid: "#3b82f6",
  processing: "#8b5cf6",
  shipped: "#22c55e",
  delivered: "#10b981",
  cancelled: "#ef4444",
  pending: "#f59e0b",
  scheduled: "#6366f1",
};

function parseDateParam(value: string | null): Date | null {
  if (!value?.trim()) return null;
  const d = parseISO(value.trim());
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export async function GET(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.view");
  if (denied) return denied;

  const url = new URL(req.url);
  const today = startOfDay(new Date());
  const to = parseDateParam(url.searchParams.get("to")) ?? today;
  const from =
    parseDateParam(url.searchParams.get("from")) ?? subDays(to, 6);
  const rangeDays = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const prevTo = subDays(from, 1);
  const prevFrom = subDays(prevTo, rangeDays - 1);

  const rangeEnd = addDays(to, 1);

  const [
    vendorCount,
    activeVendors,
    productCount,
    orderCount,
    openDeliveries,
    queueCount,
    revenueAgg,
    recentOrders,
    ordersByStatus,
    periodOrders,
    prevPeriodOrders,
    periodDeliveries,
    prevPeriodDeliveries,
    topVendorGroups,
    activeQueues,
  ] = await Promise.all([
    prisma.marketplaceVendor.count(),
    prisma.marketplaceVendor.count({ where: { status: "active" } }),
    prisma.marketplaceProduct.count(),
    prisma.marketplaceOrder.count(),
    prisma.marketplaceDelivery.count({ where: { status: { notIn: ["delivered", "failed"] } } }),
    prisma.marketplaceDeliveryQueue.count(),
    prisma.marketplaceOrder.aggregate({
      _sum: { total: true },
      where: { status: { not: "cancelled" } },
    }),
    prisma.marketplaceOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        currency: true,
        createdAt: true,
        buyerOrganizationId: true,
        vendorId: true,
      },
    }),
    prisma.marketplaceOrder.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.marketplaceOrder.findMany({
      where: { createdAt: { gte: from, lt: rangeEnd } },
      select: { createdAt: true, total: true },
    }),
    prisma.marketplaceOrder.findMany({
      where: { createdAt: { gte: prevFrom, lt: from } },
      select: { createdAt: true, total: true },
    }),
    prisma.marketplaceDelivery.findMany({
      where: { createdAt: { gte: from, lt: rangeEnd } },
      select: { createdAt: true },
    }),
    prisma.marketplaceDelivery.findMany({
      where: { createdAt: { gte: prevFrom, lt: from } },
      select: { createdAt: true },
    }),
    prisma.marketplaceOrder.groupBy({
      by: ["vendorId"],
      where: { vendorId: { not: null }, status: { not: "cancelled" } },
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    prisma.deliveryCityQueue.findMany({
      where: { queueStatus: { in: ["waiting", "ready_to_schedule", "scheduled"] } },
      orderBy: [{ companyCount: "desc" }, { city: "asc" }],
      take: 5,
      include: { vendor: { select: { name: true, logoUrl: true, logo: true } } },
    }),
  ]);

  const buyerIds = [...new Set(recentOrders.map((o) => o.buyerOrganizationId))];
  const vendorIds = [
    ...new Set([
      ...topVendorGroups.map((v) => v.vendorId).filter((v): v is bigint => v != null),
      ...recentOrders.map((o) => o.vendorId).filter((v): v is bigint => v != null),
    ]),
  ];

  const [buyers, vendors] = await Promise.all([
    buyerIds.length
      ? prisma.user.findMany({
          where: { id: { in: buyerIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    vendorIds.length
      ? prisma.marketplaceVendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, name: true, logoUrl: true, logo: true },
        })
      : Promise.resolve([]),
  ]);

  const buyerById = new Map(buyers.map((b) => [b.id.toString(), b]));
  const vendorById = new Map(vendors.map((v) => [v.id.toString(), v]));

  // Build daily chart series for the selected range.
  const seriesMap = new Map<string, { date: string; label: string; orders: number; revenue: number; deliveries: number }>();
  for (let i = 0; i < rangeDays; i++) {
    const d = addDays(from, i);
    const key = dayKey(d);
    seriesMap.set(key, {
      date: key,
      label: format(d, "MMM d"),
      orders: 0,
      revenue: 0,
      deliveries: 0,
    });
  }
  for (const o of periodOrders) {
    const key = dayKey(startOfDay(o.createdAt));
    const row = seriesMap.get(key);
    if (row) {
      row.orders += 1;
      row.revenue += Number(o.total ?? 0);
    }
  }
  for (const d of periodDeliveries) {
    const key = dayKey(startOfDay(d.createdAt));
    const row = seriesMap.get(key);
    if (row) row.deliveries += 1;
  }

  const periodOrderCount = periodOrders.length;
  const periodRevenue = periodOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const periodDeliveryCount = periodDeliveries.length;
  const prevOrderCount = prevPeriodOrders.length;
  const prevRevenue = prevPeriodOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const prevDeliveryCount = prevPeriodDeliveries.length;

  const totalStatusOrders = ordersByStatus.reduce((s, r) => s + r._count._all, 0);

  return NextResponse.json({
    ok: true,
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    stats: {
      vendorCount,
      activeVendors,
      productCount,
      orderCount,
      openDeliveries,
      queueCount,
      grossRevenue: Number(revenueAgg._sum.total ?? 0),
    },
    periodMetrics: {
      orders: periodOrderCount,
      ordersChange: pctChange(periodOrderCount, prevOrderCount),
      revenue: Math.round(periodRevenue * 100) / 100,
      revenueChange: pctChange(periodRevenue, prevRevenue),
      deliveries: periodDeliveryCount,
      deliveriesChange: pctChange(periodDeliveryCount, prevDeliveryCount),
      vendors: vendorCount,
      vendorsChange: null,
      products: productCount,
      productsChange: null,
    },
    chartSeries: [...seriesMap.values()],
    ordersByStatus: ordersByStatus.map((r) => ({
      status: r.status,
      count: r._count._all,
      percent: totalStatusOrders > 0 ? Math.round((r._count._all / totalStatusOrders) * 10000) / 100 : 0,
      color: STATUS_COLORS[r.status] ?? "#94a3b8",
    })),
    totalStatusOrders,
    recentOrders: recentOrders.map((o) => {
      const buyer = buyerById.get(o.buyerOrganizationId.toString());
      return {
        id: o.id.toString(),
        orderNumber: o.orderNumber,
        customerName: buyer?.name ?? buyer?.email ?? "—",
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
      };
    }),
    topVendors: topVendorGroups.map((v) => {
      const vendor = v.vendorId ? vendorById.get(v.vendorId.toString()) : null;
      return {
        vendorId: v.vendorId?.toString() ?? null,
        vendorName: vendor?.name ?? "Unassigned",
        logoUrl: vendor?.logoUrl ?? vendor?.logo ?? null,
        orderCount: v._count._all,
        revenue: Number(v._sum.total ?? 0),
      };
    }),
    activeQueues: activeQueues.map((q) => ({
      id: q.id.toString(),
      city: q.city,
      state: q.state,
      vendorName: q.vendor?.name ?? null,
      deliveryCount: q.companyCount,
      queueStatus: q.queueStatus,
    })),
  });
}
