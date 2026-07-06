import { NextResponse, type NextRequest } from "next/server";
import { endOfDay, parseISO, startOfDay, subDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import {
  matchesOrderTab,
  ORDER_TABS,
  pctChange,
  type OrderTabKey,
} from "@/lib/marketplace-order-status";

function parseDateParam(value: string | null): Date | null {
  if (!value?.trim()) return null;
  const d = parseISO(value.trim());
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

function formatTime12h(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (Number.isNaN(h)) return value;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function serializeListOrder(
  o: {
    id: bigint;
    orderNumber: string;
    buyerOrganizationId: bigint;
    vendorId: bigint | null;
    status: string;
    orderStatus: string | null;
    paymentStatus: string;
    deliveryStatus: string | null;
    city: string | null;
    state: string | null;
    subtotal: unknown;
    tax: unknown;
    deliveryFee: unknown;
    total: unknown;
    totalAmount: unknown;
    currency: string;
    createdAt: Date;
    vendor?: { name: string; logoUrl: string | null; logo: string | null } | null;
  },
  buyer: { name: string | null; email: string | null; phone?: string | null } | undefined,
  deliveryEvent: { deliveryDate: Date | null; startTime: string | null; endTime: string | null } | null,
  delivery: { scheduledAt: Date | null } | null,
) {
  const start = formatTime12h(deliveryEvent?.startTime);
  const end = formatTime12h(deliveryEvent?.endTime);
  const deliveryWindow =
    start && end ? `${start} – ${end}` : start || null;

  return {
    id: o.id.toString(),
    orderNumber: o.orderNumber,
    status: o.status,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    deliveryStatus: o.deliveryStatus,
    subtotal: Number(o.subtotal ?? 0),
    tax: Number(o.tax ?? 0),
    deliveryFee: Number(o.deliveryFee ?? 0),
    total: Number(o.totalAmount ?? o.total ?? 0),
    currency: o.currency,
    city: o.city,
    state: o.state,
    createdAt: o.createdAt.toISOString(),
    vendorId: o.vendorId?.toString() ?? null,
    vendorName: o.vendor?.name ?? null,
    vendorLogoUrl: o.vendor?.logoUrl ?? o.vendor?.logo ?? null,
    customerName: buyer?.name ?? buyer?.email ?? "—",
    customerEmail: buyer?.email ?? null,
    customerPhone: buyer?.phone ?? null,
    deliveryDate: deliveryEvent?.deliveryDate?.toISOString() ?? delivery?.scheduledAt?.toISOString() ?? null,
    deliveryWindow,
  };
}

export async function GET(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.orders.view");
  if (denied) return denied;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const paymentStatus = (url.searchParams.get("paymentStatus") ?? "").trim();
  const vendorIdRaw = (url.searchParams.get("vendorId") ?? "").trim();
  const tab = (url.searchParams.get("tab") ?? "all").trim() as OrderTabKey;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 10) || 10));

  const today = startOfDay(new Date());
  const from = parseDateParam(url.searchParams.get("from"));
  const to = parseDateParam(url.searchParams.get("to"));
  const rangeEnd = to ? endOfDay(to) : null;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (vendorIdRaw) {
    try {
      where.vendorId = BigInt(vendorIdRaw);
    } catch {
      /* ignore */
    }
  }
  if (from || rangeEnd) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(rangeEnd ? { lte: rangeEnd } : {}),
    };
  }
  if (search) {
    const matchingBuyers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 50,
    });
    const buyerIds = matchingBuyers.map((b) => b.id);
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { vendor: { name: { contains: search, mode: "insensitive" } } },
      ...(buyerIds.length ? [{ buyerOrganizationId: { in: buyerIds } }] : []),
    ];
  }

  const [orders, vendors, allForSummary] = await Promise.all([
    prisma.marketplaceOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { name: true, logoUrl: true, logo: true } },
      },
    }),
    prisma.marketplaceVendor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.marketplaceOrder.findMany({
      select: {
        id: true,
        status: true,
        orderStatus: true,
        deliveryStatus: true,
        paymentStatus: true,
        total: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
  ]);

  const orderIds = orders.map((o) => o.id);
  const buyerIds = [...new Set(orders.map((o) => o.buyerOrganizationId))];

  const [buyers, eventLinks, deliveries] = await Promise.all([
    buyerIds.length
      ? prisma.user.findMany({
          where: { id: { in: buyerIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    orderIds.length
      ? prisma.deliveryEventOrder.findMany({
          where: { orderId: { in: orderIds } },
          include: {
            deliveryEvent: {
              select: { deliveryDate: true, startTime: true, endTime: true },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    orderIds.length
      ? prisma.marketplaceDelivery.findMany({
          where: { orderId: { in: orderIds } },
          select: { orderId: true, scheduledAt: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const buyerById = new Map(buyers.map((b) => [b.id.toString(), b]));
  const eventByOrderId = new Map<string, (typeof eventLinks)[number]["deliveryEvent"]>();
  for (const link of eventLinks) {
    const key = link.orderId.toString();
    if (!eventByOrderId.has(key)) eventByOrderId.set(key, link.deliveryEvent);
  }
  const deliveryByOrderId = new Map<string, { scheduledAt: Date | null }>();
  for (const d of deliveries) {
    const key = d.orderId.toString();
    if (!deliveryByOrderId.has(key)) deliveryByOrderId.set(key, { scheduledAt: d.scheduledAt });
  }

  let items = orders.map((o) =>
    serializeListOrder(
      o,
      buyerById.get(o.buyerOrganizationId.toString()),
      eventByOrderId.get(o.id.toString()) ?? null,
      deliveryByOrderId.get(o.id.toString()) ?? null,
    ),
  );

  if (tab !== "all") {
    items = items.filter((o) => matchesOrderTab(o, tab));
  }

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, lastPage);
  const offset = (safePage - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);

  const tabCounts = Object.fromEntries(
    ORDER_TABS.map((t) => [
      t.key,
      t.key === "all"
        ? allForSummary.length
        : allForSummary.filter((o) => matchesOrderTab(o, t.key)).length,
    ]),
  ) as Record<OrderTabKey, number>;

  const todayStart = today;
  const todayEnd = endOfDay(today);
  const yesterdayStart = startOfDay(subDays(today, 1));
  const yesterdayEnd = endOfDay(subDays(today, 1));

  const sumRevenue = (rows: typeof allForSummary, start: Date, end: Date) =>
    rows
      .filter((o) => o.createdAt >= start && o.createdAt <= end && o.paymentStatus === "paid")
      .reduce((s, o) => s + Number(o.totalAmount ?? o.total ?? 0), 0);

  const countInRange = (rows: typeof allForSummary, start: Date, end: Date, tabKey: OrderTabKey) =>
    rows.filter(
      (o) => o.createdAt >= start && o.createdAt <= end && (tabKey === "all" ? true : matchesOrderTab(o, tabKey)),
    ).length;

  const revenueToday = sumRevenue(allForSummary, todayStart, todayEnd);
  const revenueYesterday = sumRevenue(allForSummary, yesterdayStart, yesterdayEnd);

  const summary = {
    totalOrders: allForSummary.length,
    pending: tabCounts.pending,
    processing: tabCounts.processing,
    outForDelivery: tabCounts.out_for_delivery,
    completed: tabCounts.completed,
    cancelled: tabCounts.cancelled,
    revenueToday: Math.round(revenueToday * 100) / 100,
    revenueTodayChange: pctChange(revenueToday, revenueYesterday),
    totalOrdersChange: pctChange(
      countInRange(allForSummary, todayStart, todayEnd, "all"),
      countInRange(allForSummary, yesterdayStart, yesterdayEnd, "all"),
    ),
    pendingChange: pctChange(
      countInRange(allForSummary, todayStart, todayEnd, "pending"),
      countInRange(allForSummary, yesterdayStart, yesterdayEnd, "pending"),
    ),
    processingChange: pctChange(
      countInRange(allForSummary, todayStart, todayEnd, "processing"),
      countInRange(allForSummary, yesterdayStart, yesterdayEnd, "processing"),
    ),
    outForDeliveryChange: pctChange(
      countInRange(allForSummary, todayStart, todayEnd, "out_for_delivery"),
      countInRange(allForSummary, yesterdayStart, yesterdayEnd, "out_for_delivery"),
    ),
    completedChange: pctChange(
      countInRange(allForSummary, todayStart, todayEnd, "completed"),
      countInRange(allForSummary, yesterdayStart, yesterdayEnd, "completed"),
    ),
  };

  return NextResponse.json({
    ok: true,
    items: pageItems,
    pagination: {
      page: safePage,
      pageSize,
      total,
      lastPage,
      from: total === 0 ? 0 : offset + 1,
      to: Math.min(offset + pageSize, total),
    },
    summary,
    tabCounts,
    filters: {
      vendors: vendors.map((v) => ({ id: v.id.toString(), name: v.name })),
    },
  });
}
