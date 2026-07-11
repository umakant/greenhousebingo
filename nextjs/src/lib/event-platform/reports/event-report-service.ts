import "server-only";

import { getEventCommandCenterSummary } from "@/lib/event-platform/command-center/command-center-service";
import { checkInRate, grossRevenue, netProfit, plantRemaining, profitMarginPercent, totalExpenses } from "@/lib/event-platform/reports/report-calculations";
import { buildPostEventScorecard } from "@/lib/event-platform/reports/post-event-scorecard";
import type { EventReportData } from "@/lib/event-platform/reports/event-report-types";
import { listEventAttendees } from "@/lib/event-platform/attendees/event-attendees-service";
import { getEventFinancialsOverview } from "@/lib/event-platform/event-financials/event-financials-service";
import { getEventGamesOverview } from "@/lib/event-platform/bingo-rounds/bingo-round-service";
import { getEventMarketingOverview } from "@/lib/event-platform/event-marketing/event-marketing-service";
import { getEventPlantsOverview } from "@/lib/event-platform/event-plants/event-plant-service";
import { getVenueHostOverview } from "@/lib/event-platform/event-venue-host/event-venue-host-service";
import { getChecklistStats } from "@/lib/event-platform/event-operations/event-operations-service";
import { classifyBonusTier, computePowerBuyerThreshold } from "@/lib/event-platform/attendees/event-attendees-helpers";
import { prisma } from "@/lib/prisma";

function basePath(eventId: string) {
  return `/api/event-platform/events/${encodeURIComponent(eventId)}`;
}

export async function buildEventReport(organizationId: bigint, eventIdRaw: string): Promise<EventReportData | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true, title: true, startsAt: true, status: true, capacity: true, venueName: true },
  });
  if (!event) return null;

  const [summary, financials, attendees, games, marketing, plants, venueHost, checklist, incidents, walkInCount] =
    await Promise.all([
      getEventCommandCenterSummary(organizationId, eventIdRaw),
      getEventFinancialsOverview(organizationId, eventIdRaw),
      listEventAttendees(organizationId, eventIdRaw, { page: 1, pageSize: 5000 }),
      getEventGamesOverview(organizationId, eventIdRaw),
      getEventMarketingOverview(organizationId, eventIdRaw),
      getEventPlantsOverview(organizationId, eventIdRaw),
      getVenueHostOverview(organizationId, eventIdRaw),
      getChecklistStats(organizationId, eventId),
      prisma.eventLiveIncident.count({ where: { organizationId, eventId } }),
      prisma.lmsEventRegistration.count({ where: { organizationId, eventId, registrationSource: "walk_in" } }),
    ]);

  if (!summary || !financials || !attendees || !games || !marketing || !plants || !venueHost) return null;

  const fin = financials.summary;
  const expenseMap: Record<string, number> = {};
  for (const row of financials.analytics.expenseByCategory) {
    expenseMap[row.key] = row.amount;
  }

  const ticketRev = financials.lines
    .filter((l) => l.recordType === "revenue" && l.category === "ticket_sales" && l.bucket === "actual")
    .reduce((s, l) => s + l.total, 0);
  const bonusRev = financials.lines
    .filter((l) => l.recordType === "revenue" && l.category === "bonus_card_sales" && l.bucket === "actual")
    .reduce((s, l) => s + l.total, 0);
  const sponsorRev = financials.lines
    .filter((l) => l.recordType === "revenue" && l.category === "sponsor_revenue" && l.bucket === "actual")
    .reduce((s, l) => s + l.total, 0);
  const otherRev = financials.lines
    .filter(
      (l) =>
        l.recordType === "revenue" &&
        l.bucket === "actual" &&
        !["ticket_sales", "bonus_card_sales", "sponsor_revenue"].includes(l.category),
    )
    .reduce((s, l) => s + l.total, 0);

  const gross = grossRevenue({ ticket: ticketRev, bonus: bonusRev, sponsor: sponsorRev, other: otherRev });
  const hostCost = expenseMap.host ?? 0;
  const plantCost = expenseMap.plants ?? 0;
  const venueCost = expenseMap.venue ?? 0;
  const promotionCost = expenseMap.promotions ?? 0;
  const affiliateCost = expenseMap.affiliates ?? 0;
  const otherExp = totalExpenses(expenseMap) - hostCost - plantCost - venueCost - promotionCost - affiliateCost;
  const expenses = totalExpenses(expenseMap);
  const net = netProfit(gross, expenses);
  const margin = profitMarginPercent(gross, net);

  const att = attendees.summary;
  const ciRate = checkInRate(att.checkedIn, att.totalAttendees);
  const capacityPct =
    event.capacity != null && event.capacity > 0 ? Math.round((att.totalAttendees / event.capacity) * 100) : null;

  const bonusCounts = (attendees.rows ?? []).map((r) => r.bonusCards);
  const powerThreshold = computePowerBuyerThreshold(bonusCounts.length ? bonusCounts : []);
  let powerBuyers = 0;
  for (const c of bonusCounts) {
    if (classifyBonusTier({ count: c, buyerAverage: att.bonusCardEventAverage, powerThreshold: powerThreshold }).tier === "power_buyer") {
      powerBuyers += 1;
    }
  }

  const includedWins = games.winners.filter((w) => w.cardType === "included").length;
  const bonusWins = games.winners.filter((w) => w.cardType === "bonus").length;
  const regIds = games.winners.map((w) => w.registrationId);
  const repeatWinners = regIds.length - new Set(regIds).size;

  let purchased = 0;
  let awarded = 0;
  let remaining = 0;
  let plantTotalCost = 0;
  const lowStock: string[] = [];
  for (const p of plants.plants) {
    purchased += p.quantityPurchased;
    awarded += p.quantityAwarded;
    remaining += plantRemaining(p.quantityPurchased, p.quantityAwarded, p.quantityRemoved);
    plantTotalCost += p.unitCost * p.quantityPurchased;
    if (p.status === "low_stock" || p.status === "out_of_stock") lowStock.push(p.name);
  }

  const requestCounts = new Map<string, number>();
  for (const r of plants.requests) {
    const name = r.plantName ?? "Unknown";
    requestCounts.set(name, (requestCounts.get(name) ?? 0) + 1);
  }
  const mostRequested = [...requestCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const marketingRows = marketing.sources.map((s) => ({
    source: s.sourceLabel,
    registrations: s.registrations,
    revenue: s.totalRevenue,
    spend: s.spendKnown ? s.spend : null,
    roi: s.roi,
  }));

  let lowestSource: string | null = null;
  let lowestRoi = Infinity;
  for (const s of marketingRows) {
    if (s.roi != null && s.spend != null && s.spend > 0 && s.roi < lowestRoi) {
      lowestRoi = s.roi;
      lowestSource = s.source;
    }
  }

  const venueMetrics = venueHost.venue.metrics;
  const hostMetrics = venueHost.host.metrics;

  const scorecard = buildPostEventScorecard({
    eventStatus: event.status,
    checkInRate: ciRate,
    capacityPct,
    profitMargin: margin,
    netProfit: net,
    checklistPercent: checklist.percent,
    venueAvgProfit: venueMetrics.averageProfit ?? null,
    venueThisProfit: net,
    hostRating: hostMetrics.averageEventRating?.value ?? null,
    hostOnTime: hostMetrics.onTimeArrivalRate != null ? hostMetrics.onTimeArrivalRate >= 80 : null,
    plantGapCount: plants.summary.inventoryGaps ?? 0,
    lowStockPlantNames: lowStock,
    marketingRoiBySource: marketingRows.map((s) => ({ source: s.source, roi: s.roi, registrations: s.registrations })),
    bonusCardBuyers: att.bonusCardBuyers,
    bonusCardAverage: att.bonusCardEventAverage,
    lowestPerformingSource: lowestSource,
    daysUntilEventWas: null,
    capacityFillPct: capacityPct,
  });

  const bp = basePath(eventIdRaw);

  return {
    generatedAt: new Date().toISOString(),
    eventId: eventIdRaw,
    eventSummary: {
      name: event.title,
      date: event.startsAt.toISOString(),
      venue: summary.event.venue.name,
      host: summary.event.host.name,
      status: event.status,
      capacity: event.capacity,
      registrations: att.totalAttendees,
      checkedIn: att.checkedIn,
      walkIns: walkInCount,
      noShows: att.noShows,
      checkInRate: ciRate,
    },
    financialSummary: {
      currency: fin.currency,
      ticketRevenue: ticketRev,
      bonusCardRevenue: bonusRev,
      sponsorRevenue: sponsorRev,
      otherRevenue: otherRev,
      grossRevenue: gross,
      hostCost,
      plantCost,
      venueCost,
      promotionCost,
      affiliateCost,
      otherExpenses: otherExp,
      totalExpenses: expenses,
      netProfit: net,
      profitMargin: margin,
      breakEvenRevenue: financials.breakEven.breakEvenRevenue,
      outstandingPayments: fin.outstandingPayments,
    },
    attendeeSummary: {
      newAttendees: att.newAttendees,
      returningAttendees: att.returningAttendees,
      bonusCardBuyers: att.bonusCardBuyers,
      powerBuyers,
      winners: att.bingoWinnerCount ?? 0,
      checkInRate: ciRate,
    },
    gameSummary: {
      scheduled: games.summary.totalRounds,
      completed: games.summary.completedRounds,
      winners: games.summary.totalWinners,
      repeatWinners,
      includedCardWins: includedWins,
      bonusCardWins: bonusWins,
    },
    plantSummary: {
      purchased,
      awarded,
      remaining,
      totalCost: plantTotalCost,
      mostRequested,
      inventoryGaps: plants.summary.inventoryGaps ?? 0,
    },
    venuePerformance: {
      eventsAtVenue: venueMetrics.timesUsed ?? null,
      avgAttendance: venueMetrics.averageRegistrations ?? null,
      avgRevenue: venueMetrics.averageRevenue ?? null,
      avgProfit: venueMetrics.averageProfit ?? null,
    },
    hostPerformance: {
      totalEvents: hostMetrics.completedEvents ?? null,
      avgAttendance: hostMetrics.averageAttendance ?? null,
      avgRevenue: hostMetrics.averageRevenue ?? null,
      rating: hostMetrics.averageEventRating?.value ?? null,
    },
    marketing: {
      bySource: marketingRows,
      affiliateCount: marketing.affiliates.length,
      promotionCount: marketing.promotions.length,
      sponsorContributions: sponsorRev,
    },
    operationalNotes: {
      checklistPercent: checklist.percent,
      checklistCompleted: checklist.completed,
      checklistTotal: checklist.total,
      incidentCount: incidents,
      outstandingPayments: fin.outstandingPayments,
      followUpOpen: 0,
    },
    scorecard,
    exportLinks: {
      attendees: `${bp}/attendees/export`,
      plants: `${bp}/plants/export`,
      plantRequests: `${bp}/plants/requests/export`,
      financials: `${bp}/financials/export`,
      financialsSummary: `${bp}/financials/export?section=summary`,
      winners: `${bp}/games/export?section=winners`,
      venueHistory: `${bp}/venue-host/export?section=venue`,
      hostHistory: `${bp}/venue-host/export?section=host`,
      marketingSources: `${bp}/marketing/export?section=sources`,
      activity: `${bp}/operations/export`,
      reportPdf: `${bp}/reports?format=pdf`,
      reportHtml: `${bp}/reports?format=html`,
    },
  };
}
