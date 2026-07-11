import "server-only";

import type { Prisma } from "@prisma/client";

import { isCommandCenterValidRegistration } from "@/lib/event-platform/command-center/command-center-registration";
import {
  EXPENSE_ACTUAL_STATUSES,
  REVENUE_ACTUAL_STATUSES,
} from "@/lib/event-platform/event-financials/event-financials-constants";
import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import { prisma } from "@/lib/prisma";

import type { VenueHostChartFilter } from "@/lib/event-platform/event-venue-host/event-venue-host-types";

export type EventPerformanceSnapshot = {
  eventId: string;
  title: string;
  startsAt: Date;
  status: string;
  venueName: string | null;
  capacity: number | null;
  registered: number;
  checkedIn: number;
  capacityPct: number | null;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number | null;
  bonusCards: number;
  returningRate: number | null;
  checkInRate: number | null;
  completedRoundCount: number;
  scheduledHostArrival: string | null;
  actualHostArrival: string | null;
  arrivalOnTime: boolean | null;
};

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function margin(net: number, gross: number): number | null {
  if (gross <= 0) return null;
  return round2((net / gross) * 100);
}

function isBonusTicket(ticket: { name: string; description: string | null } | null | undefined): boolean {
  if (!ticket) return false;
  const n = ticket.name.toLowerCase();
  const d = (ticket.description ?? "").toLowerCase();
  return n.includes("bonus") || d.includes("bonus card") || n.includes("extra card");
}

function parseArrival(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function compareArrival(scheduled: string | null, actual: string | null, doorsOpen: string | null): boolean | null {
  const actualAt = parseArrival(actual);
  if (!actualAt) return null;
  const scheduledAt = parseArrival(scheduled);
  if (scheduledAt) return actualAt.getTime() <= scheduledAt.getTime();
  if (doorsOpen?.trim()) {
    const [h, m] = doorsOpen.split(":").map((x) => Number.parseInt(x, 10));
    if (Number.isFinite(h)) {
      const door = new Date(actualAt);
      door.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
      return actualAt.getTime() <= door.getTime();
    }
  }
  return null;
}

export async function buildEventPerformanceSnapshots(
  organizationId: bigint,
  eventIds: bigint[],
): Promise<Map<string, EventPerformanceSnapshot>> {
  const map = new Map<string, EventPerformanceSnapshot>();
  if (!eventIds.length) return map;

  const [events, registrations, transactions, expenseRows, revenueEntries, commissions, plants, tickets, rounds] =
    await Promise.all([
      prisma.lmsTrainingEvent.findMany({
        where: { organizationId, id: { in: eventIds } },
        select: {
          id: true,
          title: true,
          startsAt: true,
          status: true,
          venueName: true,
          capacity: true,
          doorsOpen: true,
          detailContent: true,
        },
      }),
      prisma.lmsEventRegistration.findMany({
        where: { organizationId, eventId: { in: eventIds } },
        select: {
          id: true,
          eventId: true,
          studentUserId: true,
          bookingStatus: true,
          checkedInAt: true,
          ticketId: true,
        },
      }),
      prisma.lmsEventTransaction.findMany({
        where: {
          organizationId,
          eventId: { in: eventIds },
          status: { in: [...REVENUE_ACTUAL_STATUSES, "completed", "paid"] },
        },
        select: { eventId: true, amount: true, registrationId: true },
      }),
      prisma.eventExpense.findMany({
        where: { organizationId, eventId: { in: eventIds }, paymentStatus: { in: [...EXPENSE_ACTUAL_STATUSES] } },
        select: { eventId: true, total: true },
      }),
      prisma.eventRevenueEntry.findMany({
        where: { organizationId, eventId: { in: eventIds }, paymentStatus: { in: [...REVENUE_ACTUAL_STATUSES, "paid"] } },
        select: { eventId: true, amount: true, category: true },
      }),
      prisma.eventCommissionLedger.findMany({
        where: { organizationId, eventId: { in: eventIds } },
        select: { eventId: true, vendorNet: true, status: true },
      }),
      prisma.eventPlant.findMany({
        where: { organizationId, eventId: { in: eventIds }, status: { not: "removed" } },
        select: { eventId: true, unitCost: true, quantityPurchased: true },
      }),
      prisma.lmsEventTicket.findMany({
        where: { organizationId, eventId: { in: eventIds } },
        select: { id: true, eventId: true, name: true, description: true },
      }),
      prisma.eventBingoRoundInstance.findMany({
        where: { organizationId, eventId: { in: eventIds } },
        select: { eventId: true, status: true },
      }),
    ]);

  const priorAttendance = await prisma.lmsEventRegistration.findMany({
    where: {
      organizationId,
      checkedInAt: { not: null },
      bookingStatus: { notIn: ["cancelled", "refunded"] },
    },
    select: { studentUserId: true, checkedInAt: true },
  });

  const userFirstCheckIn = new Map<string, Date>();
  for (const row of priorAttendance) {
    if (!row.checkedInAt) continue;
    const key = row.studentUserId.toString();
    const cur = userFirstCheckIn.get(key);
    if (!cur || row.checkedInAt < cur) userFirstCheckIn.set(key, row.checkedInAt);
  }

  const bonusTicketIdsByEvent = new Map<string, Set<string>>();
  for (const t of tickets) {
    if (!isBonusTicket(t)) continue;
    const key = t.eventId.toString();
    const set = bonusTicketIdsByEvent.get(key) ?? new Set<string>();
    set.add(t.id.toString());
    bonusTicketIdsByEvent.set(key, set);
  }

  const regsByEvent = new Map<string, typeof registrations>();
  for (const r of registrations) {
    const key = r.eventId.toString();
    const list = regsByEvent.get(key) ?? [];
    list.push(r);
    regsByEvent.set(key, list);
  }

  for (const event of events) {
    const key = event.id.toString();
    const eventRegs = regsByEvent.get(key) ?? [];
    const regs = eventRegs.filter((r) => isCommandCenterValidRegistration(r.bookingStatus));
    const checkedIn = regs.filter((r) => r.checkedInAt).length;
    const bonusIds = bonusTicketIdsByEvent.get(key) ?? new Set<string>();

    let revenue = 0;
    for (const tx of transactions) {
      if (tx.eventId.toString() === key) revenue += num(tx.amount);
    }
    for (const rev of revenueEntries) {
      if (rev.eventId.toString() === key) revenue += num(rev.amount);
    }

    let expenses = 0;
    for (const exp of expenseRows) {
      if (exp.eventId.toString() === key) expenses += num(exp.total);
    }
    for (const comm of commissions) {
      if (!comm.eventId || comm.eventId.toString() !== key || comm.status === "cancelled") continue;
      expenses += num(comm.vendorNet);
    }
    for (const plant of plants) {
      if (plant.eventId.toString() === key) expenses += num(plant.unitCost) * plant.quantityPurchased;
    }

    let bonusCards = revenueEntries.filter(
      (r) => r.eventId.toString() === key && r.category === "bonus_card_sales",
    ).length;
    for (const reg of eventRegs) {
      const ticketId = reg.ticketId?.toString();
      if (ticketId && bonusIds.has(ticketId)) bonusCards += 1;
    }

    let returning = 0;
    for (const reg of regs) {
      if (!reg.checkedInAt) continue;
      const first = userFirstCheckIn.get(reg.studentUserId.toString());
      if (first && first < reg.checkedInAt) returning += 1;
    }

    const detail = parseDetailContent(event.detailContent);
    const ops = detail?.venueHostOps;
    const completedRoundCount = rounds.filter(
      (r) => r.eventId.toString() === key && (r.status === "completed" || r.status === "verified"),
    ).length;

    const profit = round2(revenue - expenses);
    map.set(key, {
      eventId: key,
      title: event.title,
      startsAt: event.startsAt,
      status: event.status,
      venueName: event.venueName,
      capacity: event.capacity,
      registered: regs.length,
      checkedIn,
      capacityPct: event.capacity && event.capacity > 0 ? round2((checkedIn / event.capacity) * 100) : null,
      revenue: round2(revenue),
      expenses: round2(expenses),
      profit,
      margin: margin(profit, revenue),
      bonusCards,
      returningRate: checkedIn > 0 ? round2((returning / checkedIn) * 100) : null,
      checkInRate: regs.length > 0 ? round2((checkedIn / regs.length) * 100) : null,
      completedRoundCount,
      scheduledHostArrival: ops?.scheduledHostArrival ?? null,
      actualHostArrival: ops?.actualHostArrival ?? null,
      arrivalOnTime: compareArrival(ops?.scheduledHostArrival ?? null, ops?.actualHostArrival ?? null, event.doorsOpen),
    });
  }

  return map;
}

export function average(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => n != null && Number.isFinite(n));
  if (!valid.length) return null;
  return round2(valid.reduce((s, n) => s + n, 0) / valid.length);
}

export function applyChartFilter<T extends { startsAt: Date }>(
  rows: T[],
  filter: VenueHostChartFilter,
): T[] {
  const sorted = [...rows].sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  if (filter === "last_5") return sorted.slice(0, 5);
  if (filter === "last_10") return sorted.slice(0, 10);
  if (filter === "last_12_months") {
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    return sorted.filter((r) => r.startsAt.getTime() >= cutoff);
  }
  return sorted;
}

export function aggregateVenueMetrics(snapshots: EventPerformanceSnapshot[]) {
  const now = Date.now();
  const completed = snapshots.filter((s) => s.status === "completed");
  const upcoming = snapshots.filter((s) => {
    const upcomingStatuses = new Set(["draft", "published", "registration_open", "live", "scheduled"]);
    return upcomingStatuses.has(s.status) && s.startsAt.getTime() >= now;
  });
  const dated = snapshots.filter((s) => s.startsAt);
  const sortedDates = [...dated].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const profitSorted = [...snapshots].sort((a, b) => b.profit - a.profit);
  const highest = profitSorted[0] ?? null;
  const lowest = profitSorted.length ? profitSorted[profitSorted.length - 1]! : null;

  return {
    timesUsed: snapshots.length,
    firstEventDate: sortedDates[0]?.startsAt.toISOString() ?? null,
    mostRecentEventDate: sortedDates[sortedDates.length - 1]?.startsAt.toISOString() ?? null,
    upcomingEventCount: upcoming.length,
    completedEventCount: completed.length,
    averageRegistrations: average(snapshots.map((s) => s.registered)),
    averageAttendance: average(snapshots.map((s) => s.checkedIn)),
    averageCheckInRate: average(snapshots.map((s) => s.checkInRate)),
    averageRevenue: average(snapshots.map((s) => s.revenue)),
    averageExpenses: average(snapshots.map((s) => s.expenses)),
    averageProfit: average(snapshots.map((s) => s.profit)),
    averageProfitMargin: average(snapshots.map((s) => s.margin)),
    averageBonusCardSales: average(snapshots.map((s) => s.bonusCards)),
    returningCustomerRate: average(snapshots.map((s) => s.returningRate)),
    highestPerformingEvent: highest
      ? { eventId: highest.eventId, title: highest.title, profit: highest.profit }
      : null,
    lowestPerformingEvent: lowest
      ? { eventId: lowest.eventId, title: lowest.title, profit: lowest.profit }
      : null,
  };
}

export function aggregateHostMetrics(
  snapshots: EventPerformanceSnapshot[],
  assignedCount: number,
  cancelledCount: number,
) {
  const onTimeRows = snapshots.filter((s) => s.arrivalOnTime != null);
  const onTimeRate =
    onTimeRows.length > 0
      ? round2((onTimeRows.filter((s) => s.arrivalOnTime).length / onTimeRows.length) * 100)
      : null;

  return {
    totalAssignedEvents: assignedCount,
    completedEvents: snapshots.filter((s) => s.status === "completed").length,
    cancelledEvents: cancelledCount,
    averageAttendance: average(snapshots.map((s) => s.checkedIn)),
    averageCheckInRate: average(snapshots.map((s) => s.checkInRate)),
    averageRevenue: average(snapshots.map((s) => s.revenue)),
    totalRevenueGenerated: snapshots.length ? round2(snapshots.reduce((s, r) => s + r.revenue, 0)) : null,
    averageProfit: average(snapshots.map((s) => s.profit)),
    averageBonusCardSales: average(snapshots.map((s) => s.bonusCards)),
    returningAttendeePercentage: average(snapshots.map((s) => s.returningRate)),
    onTimeArrivalRate: onTimeRate,
    onTimeSampleSize: onTimeRows.length,
    totalGamesHosted: snapshots.length ? snapshots.reduce((s, r) => s + r.completedRoundCount, 0) : null,
  };
}
