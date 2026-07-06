import "server-only";

import { format, subMonths } from "date-fns";
import { Prisma } from "@prisma/client";

import type {
  EpActivityItem,
  EpBookingStatusSlice,
  EpRecentBooking,
  EpTopEvent,
  EpTrendMetric,
  EpUpcomingEvent,
  EpVendorPayoutRow,
  EventPlatformDashboardSummary,
} from "@/lib/event-platform/dashboard-types";
import { prisma } from "@/lib/prisma";
import { getSettingsForOwner, upsertOwnerSettings } from "@/lib/settings-service";

const EP_GLOBAL_COMMISSION_KEY = "ep_global_commission_rate";

const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  completed: "Completed",
  refunded: "Refunded",
  waitlisted: "Waitlisted",
};

function trendMetric(current: number, previous: number, suffix = "from last month"): EpTrendMetric {
  if (previous === 0 && current === 0) {
    return { value: current, change: 0, changeLabel: `0 ${suffix}`, direction: "flat" };
  }
  if (previous === 0) {
    return { value: current, change: 100, changeLabel: `+${current} ${suffix}`, direction: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return {
    value: current,
    change: rounded,
    changeLabel: `${sign}${rounded}% ${suffix}`,
    direction: rounded > 0 ? "up" : rounded < 0 ? "down" : "flat",
  };
}

function trendCount(current: number, previous: number): EpTrendMetric {
  const delta = current - previous;
  const sign = delta > 0 ? "+" : "";
  return {
    value: current,
    change: delta,
    changeLabel: `${sign}${delta} from last month`,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

function formatActionLabel(action: string, entityType: string): string {
  const map: Record<string, string> = {
    "vendor.created": "New vendor added",
    "page.created": "CMS page published",
    "seatmap.created": "Seat map template created",
    "seatmap.updated": "Seat map updated",
    "menu.created": "Navigation menu created",
    "menu_item.created": "Menu item added",
    "payout.created": "Vendor payout batch created",
  };
  return map[action] ?? `${entityType.replace(/_/g, " ")} — ${action.replace(/\./g, " ")}`;
}

async function getRevenueByMonth(organizationId: bigint) {
  const start = subMonths(new Date(), 5);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [transactions, ledgerRows] = await Promise.all([
    prisma.lmsEventTransaction.findMany({
      where: { organizationId, status: "completed", processedAt: { gte: start } },
      select: { amount: true, processedAt: true },
    }),
    prisma.eventCommissionLedger.findMany({
      where: { organizationId, createdAt: { gte: start } },
      select: { platformCommission: true, createdAt: true },
    }),
  ]);

  const revenueMap = new Map<string, number>();
  const commissionMap = new Map<string, number>();

  for (const tx of transactions) {
    const key = format(tx.processedAt, "MMM yyyy");
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(tx.amount));
  }
  for (const row of ledgerRows) {
    const key = format(row.createdAt, "MMM yyyy");
    commissionMap.set(key, (commissionMap.get(key) ?? 0) + Number(row.platformCommission));
  }

  return Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const month = format(d, "MMM yyyy");
    return {
      month,
      revenue: Math.round((revenueMap.get(month) ?? 0) * 100) / 100,
      commission: Math.round((commissionMap.get(month) ?? 0) * 100) / 100,
    };
  });
}

export async function readGlobalCommissionRate(organizationId: bigint): Promise<number> {
  const settings = await getSettingsForOwner(organizationId);
  const raw = settings[EP_GLOBAL_COMMISSION_KEY]?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 10;
}

export async function writeGlobalCommissionRate(organizationId: bigint, rate: number): Promise<void> {
  await upsertOwnerSettings(organizationId, [{ key: EP_GLOBAL_COMMISSION_KEY, value: String(rate) }]);
}

export async function getEventPlatformDashboardSummary(organizationId: bigint): Promise<EventPlatformDashboardSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = subMonths(monthStart, 1);
  const prevMonthEnd = new Date(monthStart.getTime() - 1);

  const [
    vendorCounts,
    eventCount,
    registrationCount,
    revenueAgg,
    totalCommissionAgg,
    pendingCommissionAgg,
    pendingPayoutCount,
    pendingPayoutAmountAgg,
    activePopupCount,
    publishedPageCount,
    eventsThisMonth,
    eventsPrevMonth,
    bookingsThisMonth,
    bookingsPrevMonth,
    revenueThisMonth,
    revenuePrevMonth,
    commissionThisMonth,
    commissionPrevMonth,
    vendorsThisMonth,
    vendorsPrevMonth,
    bookingStatusGroups,
    topEventRevenue,
    recentBookingsRaw,
    vendorPayoutGroups,
    upcomingRaw,
    auditRows,
  ] = await Promise.all([
    prisma.eventVendor.groupBy({
      by: ["status"],
      where: { organizationId, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.lmsTrainingEvent.count({ where: { organizationId } }),
    prisma.lmsEventRegistration.count({ where: { organizationId } }),
    prisma.lmsEventTransaction.aggregate({
      where: { organizationId, status: "completed" },
      _sum: { amount: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId },
      _sum: { platformCommission: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, status: "pending" },
      _sum: { platformCommission: true, vendorNet: true },
    }),
    prisma.eventVendorPayout.count({ where: { organizationId, status: "pending" } }),
    prisma.eventVendorPayout.aggregate({
      where: { organizationId, status: "pending" },
      _sum: { totalAmount: true },
    }),
    prisma.eventAnnouncementPopup.count({ where: { organizationId, isActive: true, archivedAt: null } }),
    prisma.eventCustomPage.count({ where: { organizationId, status: "published", archivedAt: null } }),
    prisma.lmsTrainingEvent.count({
      where: { organizationId, createdAt: { gte: monthStart } },
    }),
    prisma.lmsTrainingEvent.count({
      where: { organizationId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
    }),
    prisma.lmsEventRegistration.count({
      where: { organizationId, createdAt: { gte: monthStart } },
    }),
    prisma.lmsEventRegistration.count({
      where: { organizationId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
    }),
    prisma.lmsEventTransaction.aggregate({
      where: { organizationId, status: "completed", processedAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.lmsEventTransaction.aggregate({
      where: {
        organizationId,
        status: "completed",
        processedAt: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, createdAt: { gte: monthStart } },
      _sum: { platformCommission: true },
    }),
    prisma.eventCommissionLedger.aggregate({
      where: { organizationId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { platformCommission: true },
    }),
    prisma.eventVendor.count({
      where: { organizationId, status: "active", createdAt: { gte: monthStart }, archivedAt: null },
    }),
    prisma.eventVendor.count({
      where: {
        organizationId,
        status: "active",
        createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        archivedAt: null,
      },
    }),
    prisma.lmsEventRegistration.groupBy({
      by: ["bookingStatus"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.lmsEventTransaction.groupBy({
      by: ["eventId"],
      where: { organizationId, status: "completed" },
      _sum: { amount: true },
    }),
    prisma.lmsEventRegistration.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        attendeeName: true,
        bookingStatus: true,
        amountPaid: true,
        createdAt: true,
        event: { select: { title: true } },
      },
    }),
    prisma.eventCommissionLedger.groupBy({
      by: ["vendorId"],
      where: { organizationId, status: "pending" },
      _sum: { vendorNet: true },
    }),
    prisma.lmsTrainingEvent.findMany({
      where: {
        organizationId,
        startsAt: { gt: now },
        status: { notIn: ["draft", "cancelled", "archived"] },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        startsAt: true,
        venueName: true,
        eventType: true,
        category: { select: { name: true } },
      },
    }),
    prisma.eventAuditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, entityType: true, createdAt: true },
    }),
  ]);

  const totalVendors = vendorCounts.reduce((s, r) => s + r._count._all, 0);
  const activeVendors = vendorCounts.find((r) => r.status === "active")?._count._all ?? 0;
  const grossRevenue = revenueAgg._sum.amount ?? new Prisma.Decimal(0);
  const totalPlatformCommission = totalCommissionAgg._sum.platformCommission ?? new Prisma.Decimal(0);
  const pendingPlatformCommission = pendingCommissionAgg._sum.platformCommission ?? new Prisma.Decimal(0);
  const pendingVendorNet = pendingCommissionAgg._sum.vendorNet ?? new Prisma.Decimal(0);
  const pendingPayoutAmount = pendingPayoutAmountAgg._sum.totalAmount ?? new Prisma.Decimal(0);

  const [recentVendors, recentPayouts] = await Promise.all([
    prisma.eventVendor.findMany({
      where: { organizationId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, vendorName: true, status: true, createdAt: true },
    }),
    prisma.eventVendorPayout.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { vendor: { select: { vendorName: true } } },
    }),
  ]);

  const globalCommissionRate = await readGlobalCommissionRate(organizationId);
  const revenueByMonth = await getRevenueByMonth(organizationId);

  const topEventRevenueSorted = [...topEventRevenue]
    .sort((a, b) => Number(b._sum.amount ?? 0) - Number(a._sum.amount ?? 0))
    .slice(0, 5);
  const topEventIds = topEventRevenueSorted.map((r) => r.eventId);
  const topEvents = topEventIds.length
    ? await prisma.lmsTrainingEvent.findMany({
        where: { id: { in: topEventIds }, organizationId },
        select: { id: true, title: true, imageUrl: true },
      })
    : [];
  const eventById = new Map(topEvents.map((e) => [e.id.toString(), e]));

  const topPerformingEvents: EpTopEvent[] = topEventRevenueSorted.map((row, i) => {
    const ev = eventById.get(row.eventId.toString());
    return {
      id: row.eventId.toString(),
      title: ev?.title ?? "Event",
      imageUrl: ev?.imageUrl ?? null,
      revenue: (row._sum.amount ?? new Prisma.Decimal(0)).toString(),
      rank: i + 1,
    };
  });

  const bookingTotal = bookingStatusGroups.reduce((s, g) => s + g._count._all, 0);
  const bookingsByStatus: EpBookingStatusSlice[] = bookingStatusGroups
    .map((g) => ({
      status: g.bookingStatus,
      label: BOOKING_STATUS_LABELS[g.bookingStatus] ?? g.bookingStatus,
      count: g._count._all,
      percent: bookingTotal > 0 ? Math.round((g._count._all / bookingTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const vendorIds = vendorPayoutGroups.map((g) => g.vendorId);
  const payoutVendors = vendorIds.length
    ? await prisma.eventVendor.findMany({
        where: { id: { in: vendorIds }, organizationId },
        select: { id: true, vendorName: true },
      })
    : [];
  const vendorNameById = new Map(payoutVendors.map((v) => [v.id.toString(), v.vendorName]));

  const lastPayouts = vendorIds.length
    ? await prisma.eventVendorPayout.findMany({
        where: { organizationId, vendorId: { in: vendorIds }, status: "paid" },
        orderBy: { paidAt: "desc" },
        select: { vendorId: true, paidAt: true },
      })
    : [];
  const lastPaidByVendor = new Map<string, Date>();
  for (const p of lastPayouts) {
    const key = p.vendorId.toString();
    if (!lastPaidByVendor.has(key) && p.paidAt) lastPaidByVendor.set(key, p.paidAt);
  }

  const vendorPayoutSummary: EpVendorPayoutRow[] = vendorPayoutGroups
    .map((g) => ({
      vendorId: g.vendorId.toString(),
      vendorName: vendorNameById.get(g.vendorId.toString()) ?? "Vendor",
      pendingAmount: (g._sum.vendorNet ?? new Prisma.Decimal(0)).toString(),
      lastPayoutAt: lastPaidByVendor.get(g.vendorId.toString())?.toISOString() ?? null,
    }))
    .sort((a, b) => Number(b.pendingAmount) - Number(a.pendingAmount))
    .slice(0, 5);

  const recentBookings: EpRecentBooking[] = recentBookingsRaw.map((r) => ({
    id: r.id.toString(),
    attendeeName: r.attendeeName,
    eventTitle: r.event.title,
    amount: r.amountPaid.toString(),
    status: r.bookingStatus,
    createdAt: r.createdAt.toISOString(),
  }));

  const upcomingEvents: EpUpcomingEvent[] = upcomingRaw.map((e) => ({
    id: e.id.toString(),
    title: e.title,
    imageUrl: e.imageUrl,
    startsAt: e.startsAt.toISOString(),
    venueName: e.venueName,
    eventType: e.eventType,
    categoryName: e.category?.name ?? null,
  }));

  const platformActivity: EpActivityItem[] = auditRows.map((a) => ({
    id: a.id.toString(),
    action: a.action,
    label: formatActionLabel(a.action, a.entityType),
    createdAt: a.createdAt.toISOString(),
  }));

  // Fallback activity when audit log is empty
  if (platformActivity.length === 0 && recentBookings.length > 0) {
    for (const b of recentBookings.slice(0, 4)) {
      platformActivity.push({
        id: `booking-${b.id}`,
        action: "booking.created",
        label: `New booking — ${b.eventTitle}`,
        createdAt: b.createdAt,
      });
    }
  }

  return {
    totalVendors,
    activeVendors,
    totalEvents: eventCount,
    totalBookings: registrationCount,
    grossRevenue: grossRevenue.toString(),
    platformCommissionPending: pendingPlatformCommission.toString(),
    totalPlatformCommission: totalPlatformCommission.toString(),
    vendorNetPending: pendingVendorNet.toString(),
    pendingPayouts: pendingPayoutCount,
    pendingPayoutAmount: pendingPayoutAmount.toString(),
    pendingPayoutVendorCount: vendorPayoutGroups.length,
    activePopups: activePopupCount,
    publishedPages: publishedPageCount,
    globalCommissionRate,
    revenueByMonth,
    trends: {
      events: trendCount(eventsThisMonth, eventsPrevMonth),
      bookings: trendMetric(bookingsThisMonth, bookingsPrevMonth),
      revenue: trendMetric(
        Number(revenueThisMonth._sum.amount ?? 0),
        Number(revenuePrevMonth._sum.amount ?? 0),
      ),
      commission: trendMetric(
        Number(commissionThisMonth._sum.platformCommission ?? 0),
        Number(commissionPrevMonth._sum.platformCommission ?? 0),
      ),
      activeVendors: trendCount(vendorsThisMonth, vendorsPrevMonth),
      pendingPayouts: {
        value: pendingPayoutCount,
        change: vendorPayoutGroups.length,
        changeLabel: `${vendorPayoutGroups.length} vendor${vendorPayoutGroups.length === 1 ? "" : "s"}`,
        direction: "flat" as const,
      },
    },
    bookingsByStatus,
    topPerformingEvents,
    recentBookings,
    vendorPayoutSummary,
    upcomingEvents,
    platformActivity,
    recentVendors: recentVendors.map((v) => ({
      id: v.id.toString(),
      vendorName: v.vendorName,
      status: v.status,
      createdAt: v.createdAt.toISOString(),
    })),
    recentPayouts: recentPayouts.map((p) => ({
      id: p.id.toString(),
      vendorName: p.vendor.vendorName,
      totalAmount: p.totalAmount.toString(),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export async function writeEventAuditLog(input: {
  organizationId: bigint;
  actorUserId?: bigint | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.eventAuditLog.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadataJson: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
    },
  }).catch(() => null);
}
