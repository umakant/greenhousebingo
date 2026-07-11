import "server-only";

import { format } from "date-fns";

import { buildCheckInTrend, buildRegistrationTrend } from "@/lib/event-platform/command-center/command-center-charts";
import {
  metricAvailable,
  metricNoRecords,
  metricNotConfigured,
  netFromGrossAndExpenses,
  numFromDecimal,
  profitMarginFrom,
  sumMetrics,
} from "@/lib/event-platform/command-center/command-center-helpers";
import {
  buildHealth,
  deriveOperations,
} from "@/lib/event-platform/command-center/command-center-health";
import { buildOperationalAlerts } from "@/lib/event-platform/event-operations/event-alert-engine";
import { getChecklistStats } from "@/lib/event-platform/event-operations/event-operations-service";
import { getPlantInventoryReady } from "@/lib/event-platform/event-plants/event-plant-service";
import { getEventExpenseTotals } from "@/lib/event-platform/event-financials/event-financials-service";
import {
  filterCapacityRegistrations,
  filterValidRegistrations,
  type CommandCenterRegistrationRow,
} from "@/lib/event-platform/command-center/command-center-registration";
import type {
  CommandCenterMetricAvailability,
  CommandCenterActivityItem,
  CommandCenterEventSummary,
  CommandCenterTimelineItem,
  EventCommandCenterSummary,
  EventCommandCenterSummaryOptions,
} from "@/lib/event-platform/command-center/command-center-types";
import { mapDbEvent } from "@/lib/lms-events/db-repository";
import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import {
  BONUS_CARD_TICKET_DESCRIPTION,
  DEFAULT_BONUS_CARD_NAME,
  EXTRA_BINGO_CARD_TICKET_NAME,
} from "@/lib/lms-events/event-wizard-input";
import { scheduleValueToIso, splitScheduleIso } from "@/lib/lms-events/event-schedule-helpers";
import { prisma } from "@/lib/prisma";

function isBonusTicket(ticket: { name: string; description: string | null } | null | undefined): boolean {
  if (!ticket) return false;
  return (
    ticket.description === BONUS_CARD_TICKET_DESCRIPTION ||
    ticket.name === EXTRA_BINGO_CARD_TICKET_NAME ||
    ticket.name === DEFAULT_BONUS_CARD_NAME
  );
}

function timelineStatus(at: Date | null, now: Date): CommandCenterTimelineItem["status"] {
  if (!at) return "unknown";
  if (at.getTime() > now.getTime()) return "upcoming";
  if (at.getTime() <= now.getTime()) return "past";
  return "current";
}

function buildTimeline(input: {
  startsAt: Date;
  endsAt: Date;
  doorsOpen: string | null;
  bingoStart: string | null;
  bingoEnd: string | null;
  rounds: Array<{ roundNumber: number; name: string }>;
}): CommandCenterTimelineItem[] {
  const now = new Date();
  const eventDate = splitScheduleIso(input.startsAt.toISOString()).date;
  const setupAt = new Date(input.startsAt.getTime() - 2 * 60 * 60 * 1000);
  const hostArrivalAt = new Date(input.startsAt.getTime() - 60 * 60 * 1000);
  const doorsIso = scheduleValueToIso(input.doorsOpen, eventDate, input.startsAt.toISOString());
  const bingoStartIso = scheduleValueToIso(input.bingoStart, eventDate, input.startsAt.toISOString());
  const bingoEndIso = scheduleValueToIso(input.bingoEnd, eventDate, input.endsAt.toISOString());

  const items: CommandCenterTimelineItem[] = [
    {
      id: "setup",
      label: "Setup",
      time: setupAt.toISOString(),
      sortAt: setupAt.toISOString(),
      status: timelineStatus(setupAt, now),
    },
    {
      id: "host-arrival",
      label: "Host arrival",
      time: hostArrivalAt.toISOString(),
      sortAt: hostArrivalAt.toISOString(),
      status: timelineStatus(hostArrivalAt, now),
    },
    {
      id: "doors-open",
      label: "Doors open",
      time: doorsIso || null,
      sortAt: doorsIso || null,
      status: doorsIso ? timelineStatus(new Date(doorsIso), now) : "unknown",
    },
    {
      id: "bingo-start",
      label: "Bingo start",
      time: bingoStartIso || null,
      sortAt: bingoStartIso || null,
      status: bingoStartIso ? timelineStatus(new Date(bingoStartIso), now) : "unknown",
    },
  ];

  for (const round of input.rounds) {
    items.push({
      id: `round-${round.roundNumber}`,
      label: `Round ${round.roundNumber}: ${round.name}`,
      time: null,
      sortAt: bingoStartIso || input.startsAt.toISOString(),
      status: "unknown",
    });
  }

  if (input.rounds.length > 1) {
    items.push({
      id: "intermission",
      label: "Intermission",
      time: null,
      sortAt: bingoStartIso || input.startsAt.toISOString(),
      status: "unknown",
    });
  }

  if (input.rounds.length > 0) {
    const last = input.rounds[input.rounds.length - 1];
    items.push({
      id: "final-game",
      label: `Final game: ${last.name}`,
      time: null,
      sortAt: bingoEndIso || input.endsAt.toISOString(),
      status: "unknown",
    });
  }

  items.push(
    {
      id: "event-close",
      label: "Event close",
      time: input.endsAt.toISOString(),
      sortAt: input.endsAt.toISOString(),
      status: timelineStatus(input.endsAt, now),
    },
    {
      id: "settlement",
      label: "Settlement",
      time: new Date(input.endsAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      sortAt: new Date(input.endsAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: timelineStatus(new Date(input.endsAt.getTime() + 24 * 60 * 60 * 1000), now),
    },
  );

  return items.sort((a, b) => {
    const ta = a.sortAt ? new Date(a.sortAt).getTime() : 0;
    const tb = b.sortAt ? new Date(b.sortAt).getTime() : 0;
    return ta - tb;
  });
}

function buildRecentActivity(input: {
  registrations: CommandCenterRegistrationRow[];
  auditLogs: Array<{ id: bigint; action: string; entityType: string; createdAt: Date }>;
}): CommandCenterActivityItem[] {
  const items: CommandCenterActivityItem[] = [];

  for (const row of input.registrations.slice(0, 5)) {
    items.push({
      id: `reg-${row.attendeeName}-${row.registeredAt.getTime()}`,
      at: row.registeredAt.toISOString(),
      title: "Registration",
      detail: `${row.attendeeName} registered${row.ticketName ? ` (${row.ticketName})` : ""}`,
      kind: "registration",
    });
    if (row.checkedInAt) {
      items.push({
        id: `ci-${row.attendeeName}-${row.checkedInAt.getTime()}`,
        at: row.checkedInAt.toISOString(),
        title: "Check-in",
        detail: `${row.attendeeName} checked in`,
        kind: "check_in",
      });
    }
  }

  for (const log of input.auditLogs) {
    items.push({
      id: `audit-${log.id.toString()}`,
      at: log.createdAt.toISOString(),
      title: log.entityType.replace(/_/g, " "),
      detail: log.action.replace(/\./g, " "),
      kind: "audit",
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);
}

export async function getEventCommandCenterSummary(
  organizationId: bigint,
  eventIdRaw: string,
  options: EventCommandCenterSummaryOptions = {},
): Promise<EventCommandCenterSummary | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const regTrend = options.registrationTrendDays ?? 30;

  const eventRow = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    include: { category: true },
  });
  if (!eventRow) return null;

  const [registrationRows, ticketRows, transactionRows, hostInvitations, auditLogs, pendingCommissions, plantCount] =
    await Promise.all([
      prisma.lmsEventRegistration.findMany({
        where: { organizationId, eventId },
        include: { ticket: true },
        orderBy: { registeredAt: "desc" },
      }),
      prisma.lmsEventTicket.findMany({ where: { organizationId, eventId } }),
      prisma.lmsEventTransaction.findMany({
        where: { organizationId, eventId, status: "completed" },
      }),
      prisma.eventHostInvitation.findMany({
        where: { organizationId, eventId },
        include: { host: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.eventAuditLog.findMany({
        where: {
          organizationId,
          entityId: eventId.toString(),
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, action: true, entityType: true, createdAt: true },
      }),
      prisma.eventCommissionLedger.count({
        where: { organizationId, eventId, status: "pending" },
      }),
      prisma.eventPlant.count({
        where: { organizationId, eventId, status: { not: "removed" } },
      }),
    ]);

  const detailContent = parseDetailContent(eventRow.detailContent);
  const mappedEvent = mapDbEvent(eventRow);

  const regRows: CommandCenterRegistrationRow[] = registrationRows.map((r) => ({
    bookingStatus: r.bookingStatus,
    paymentStatus: r.paymentStatus,
    registeredAt: r.registeredAt,
    checkedInAt: r.checkedInAt,
    amountPaid: numFromDecimal(r.amountPaid),
    ticketName: r.ticket?.name ?? null,
    attendeeName: r.attendeeName,
  }));

  const validRegs = filterValidRegistrations(regRows);
  const capacityRegs = filterCapacityRegistrations(regRows);
  const registrations = validRegs.length;
  const ticketQuantity = capacityRegs.length;
  const checkedIn = validRegs.filter((r) => r.checkedInAt).length;
  const notCheckedIn = registrations - checkedIn;

  const capacity = eventRow.capacity;
  const remainingCapacity =
    capacity != null
      ? metricAvailable(Math.max(0, capacity - ticketQuantity))
      : metricNotConfigured();

  const bingoRounds = detailContent?.bingoRounds ?? [];
  const gamesCount = bingoRounds.length;
  const gamesWithPrizes = bingoRounds.filter((r) => r.prize?.trim()).length;

  const bonusTicketIds = new Set(
    ticketRows.filter((t) => isBonusTicket(t)).map((t) => t.id.toString()),
  );

  let ticketRevenue = 0;
  let bonusCardRevenue = 0;
  for (const tx of transactionRows) {
    const reg = registrationRows.find((r) => r.id === tx.registrationId);
    const amount = numFromDecimal(tx.amount);
    if (reg?.ticketId && bonusTicketIds.has(reg.ticketId.toString())) {
      bonusCardRevenue += amount;
    } else {
      ticketRevenue += amount;
    }
  }

  const ticketRevenueMetric =
    transactionRows.length > 0 || ticketRevenue > 0
      ? metricAvailable(Math.round(ticketRevenue * 100) / 100)
      : metricNoRecords();

  const bonusRevenueMetric =
    ticketRows.some((t) => isBonusTicket(t))
      ? bonusCardRevenue > 0 || transactionRows.length > 0
        ? metricAvailable(Math.round(bonusCardRevenue * 100) / 100)
        : metricNoRecords()
      : metricNotConfigured();

  const sponsorRevenueMetric = metricNotConfigured();
  const otherRevenueMetric = metricNotConfigured();

  const grossRevenue = sumMetrics([
    ticketRevenueMetric,
    bonusRevenueMetric,
    sponsorRevenueMetric,
    otherRevenueMetric,
  ]);

  const expenseTotals = await getEventExpenseTotals(organizationId, eventId).catch(() => ({
    actual: 0,
    pending: 0,
  }));

  const [plantCostRows, commissionRows] = await Promise.all([
    prisma.eventPlant.findMany({
      where: { organizationId, eventId, status: { not: "removed" } },
      select: { unitCost: true, quantityPurchased: true },
    }),
    prisma.eventCommissionLedger.findMany({
      where: { organizationId, eventId },
      select: { vendorNet: true, status: true },
    }),
  ]);

  const plantCost = plantCostRows.reduce((s, p) => s + numFromDecimal(p.unitCost) * p.quantityPurchased, 0);
  const commissionPending = commissionRows
    .filter((c) => c.status !== "paid")
    .reduce((s, c) => s + numFromDecimal(c.vendorNet), 0);
  const commissionPaid = commissionRows
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + numFromDecimal(c.vendorNet), 0);

  const totalExpenseActual = Math.round((expenseTotals.actual + plantCost + commissionPaid) * 100) / 100;
  const totalExpensePending = Math.round((expenseTotals.pending + commissionPending) * 100) / 100;
  const totalExpenses =
    totalExpenseActual > 0 || totalExpensePending > 0
      ? metricAvailable(totalExpenseActual)
      : expenseTotals.actual === 0 && expenseTotals.pending === 0 && plantCost === 0 && commissionRows.length === 0
        ? metricNoRecords()
        : metricAvailable(totalExpenseActual);
  const netProfit = netFromGrossAndExpenses(grossRevenue, totalExpenses);
  const profitMargin = profitMarginFrom(grossRevenue, netProfit);

  const acceptedInvite = hostInvitations.find((i) => i.status === "accepted");
  const hostFromDetail = detailContent?.host;
  const hostConfirmed = Boolean(acceptedInvite || hostFromDetail?.name?.trim() || eventRow.instructorName?.trim());
  const hostConfirmedSource = acceptedInvite
    ? "invitation"
    : hostFromDetail?.name?.trim() || eventRow.instructorName?.trim()
      ? "assigned"
      : "none";

  const hostName =
    acceptedInvite?.host.displayName?.trim() ||
    hostFromDetail?.name?.trim() ||
    eventRow.instructorName?.trim() ||
    null;

  const paymentsOutstanding = validRegs.filter(
    (r) => r.paymentStatus === "unpaid" || r.paymentStatus === "pending",
  ).length;

  const plantInventory = await getPlantInventoryReady(organizationId, eventRow.id, registrations).catch(
    () => ({ ready: false, totalRemaining: 0, gapCount: 0 }),
  );
  const plantInventoryReady: CommandCenterMetricAvailability = plantInventory.totalRemaining > 0
    ? plantInventory.ready
      ? "available"
      : "no_records"
    : "no_records";
  const gamesReady = gamesCount > 0 && gamesWithPrizes === gamesCount;

  const [checklist, alertDismissals, venueHostExpenses, plantRequestCount] = await Promise.all([
    getChecklistStats(organizationId, eventId).catch(() => ({
      percent: 0,
      completed: 0,
      total: 0,
      overdue: 0,
      tasks: [],
      completionAvailability: "not_configured" as CommandCenterMetricAvailability,
    })),
    prisma.eventAlertDismissal.findMany({
      where: { organizationId, eventId },
      select: { alertKey: true },
    }),
    prisma.eventExpense.findMany({
      where: { organizationId, eventId, category: { in: ["venue", "host"] } },
      select: { category: true, paymentStatus: true },
    }),
    prisma.eventPlantRequest.count({ where: { organizationId, eventId } }),
  ]);

  const plantRemaining = plantInventory.totalRemaining;
  const operations = deriveOperations({
    hostConfirmed,
    hostConfirmedSource,
    venueName: eventRow.venueName,
    gamesReady,
    plantInventoryReady,
    paymentsOutstanding,
    checklistCompletion: checklist.completionAvailability,
  });

  const health = buildHealth({
    capacity,
    registrations,
    hostConfirmed,
    venueConfirmed: operations.venueConfirmed,
    gamesCount,
    gamesWithPrizes,
    plantInventoryReady,
    grossRevenue,
    promotionConfigured: eventRow.isPublic || eventRow.isFeatured,
    checklistCompletion: operations.checklistCompletion,
  });

  const venueExp = venueHostExpenses.find((e) => e.category === "venue");
  const hostExp = venueHostExpenses.find((e) => e.category === "host");
  const sponsorExt = detailContent?.sponsor as { completedDeliverables?: string[]; deliverables?: string[] } | undefined;

  const alerts = buildOperationalAlerts({
    hostConfirmed,
    venueName: eventRow.venueName,
    venueConfirmed: operations.venueConfirmed,
    gamesCount,
    gamesWithPrizes,
    remainingCapacity,
    capacity,
    registrations,
    paymentsOutstanding,
    plantInventoryReady,
    pendingCommissions,
    startsAt: eventRow.startsAt,
    hostPaymentPending: Boolean(hostExp && hostExp.paymentStatus !== "paid"),
    venuePaymentOverdue: Boolean(venueExp && venueExp.paymentStatus !== "paid"),
    plantDemandExceedsInventory: plantRequestCount > plantRemaining && plantRequestCount > 0,
    sponsorDeliverablesIncomplete: Boolean(
      sponsorExt?.deliverables?.length &&
        (sponsorExt.completedDeliverables?.length ?? 0) < (sponsorExt.deliverables?.length ?? 0),
    ),
    dismissedKeys: new Set(alertDismissals.map((d) => d.alertKey)),
  });

  const registrationTrend = buildRegistrationTrend(regRows, regTrend, capacity);
  const checkInTrend = buildCheckInTrend(regRows, eventRow.startsAt);

  const eventSummary: CommandCenterEventSummary = {
    id: mappedEvent.id,
    title: mappedEvent.title,
    slug: mappedEvent.slug,
    status: mappedEvent.status,
    eventType: mappedEvent.eventType,
    startsAt: mappedEvent.startsAt,
    endsAt: mappedEvent.endsAt,
    timezone: mappedEvent.timezone,
    doorsOpen: mappedEvent.doorsOpen,
    bingoStart: mappedEvent.bingoStart,
    bingoEnd: detailContent?.bingoEnd ?? null,
    capacity,
    venue: {
      name: mappedEvent.venueName,
      address: mappedEvent.venueAddress,
      city: mappedEvent.venueCity,
      state: mappedEvent.venueState,
      postalCode: mappedEvent.venuePostalCode,
      country: mappedEvent.venueCountry,
      type: mappedEvent.venueType,
    },
    host: {
      name: hostName,
      bio: hostFromDetail?.bio ?? null,
      imageUrl: hostFromDetail?.imageUrl ?? null,
      invitationStatus: acceptedInvite?.status ?? hostInvitations[0]?.status ?? null,
    },
    description: mappedEvent.description,
    shortDescription: mappedEvent.shortDescription,
    isPublic: mappedEvent.isPublic,
    isFeatured: mappedEvent.isFeatured,
    isFree: mappedEvent.isFree,
    currency: mappedEvent.currency,
    ageRule: mappedEvent.ageRule,
    cardsIncluded: mappedEvent.cardsIncluded,
    extraCardPrice: mappedEvent.extraCardPrice,
    foodAndDrinks: mappedEvent.foodAndDrinks,
    attire: mappedEvent.attire,
    priceFrom: mappedEvent.priceFrom,
    detailContent,
  };

  const timeline = buildTimeline({
    startsAt: eventRow.startsAt,
    endsAt: eventRow.endsAt,
    doorsOpen: eventRow.doorsOpen,
    bingoStart: eventRow.bingoStart,
    bingoEnd: detailContent?.bingoEnd ?? null,
    rounds: bingoRounds.map((r) => ({ roundNumber: r.roundNumber, name: r.name })),
  });

  const recentActivity = buildRecentActivity({
    registrations: [...regRows].sort(
      (a, b) => b.registeredAt.getTime() - a.registeredAt.getTime(),
    ),
    auditLogs,
  });

  return {
    event: eventSummary,
    counts: {
      registrations,
      ticketQuantity,
      checkedIn,
      notCheckedIn,
      walkIns: metricNotConfigured(),
      remainingCapacity,
      games: gamesCount,
      plants: plantCount > 0 ? metricAvailable(plantCount) : metricNoRecords(),
      activityItems: recentActivity.length,
    },
    financial: {
      ticketRevenue: ticketRevenueMetric,
      bonusCardRevenue: bonusRevenueMetric,
      sponsorRevenue: sponsorRevenueMetric,
      otherRevenue: otherRevenueMetric,
      grossRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
    },
    operations,
    health,
    alerts,
    charts: {
      registrationTrend,
      checkInTrend,
      revenueVsExpenses: {
        revenue: [
          { key: "tickets", label: "Tickets", metric: ticketRevenueMetric },
          { key: "bonus", label: "Bonus cards", metric: bonusRevenueMetric },
          { key: "sponsors", label: "Sponsors", metric: sponsorRevenueMetric },
          { key: "other", label: "Other", metric: otherRevenueMetric },
        ],
        expenses: [
          { key: "host", label: "Host", metric: metricNotConfigured() },
          { key: "plants", label: "Plants", metric: metricNotConfigured() },
          { key: "venue", label: "Venue", metric: metricNotConfigured() },
          { key: "promotions", label: "Promotions", metric: metricNotConfigured() },
          { key: "affiliates", label: "Affiliates", metric: metricNotConfigured() },
          { key: "other", label: "Other", metric: metricNotConfigured() },
        ],
      },
    },
    timeline,
    recentActivity,
  };
}

export function formatCommandCenterDate(iso: string, pattern = "MMM d, yyyy"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, pattern);
}
