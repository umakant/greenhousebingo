import "server-only";

import { Prisma } from "@prisma/client";

import {
  attendeeInitials,
  classifyBonusTier,
  computeBonusCardCount,
  computePowerBuyerThreshold,
  formatRegistrationSource,
  isBonusTicketRow,
  splitAttendeeName,
} from "@/lib/event-platform/attendees/event-attendees-helpers";
import type {
  EventAttendeeActivityItem,
  EventAttendeeCheckInStatus,
  EventAttendeeCustomerType,
  EventAttendeeDetail,
  EventAttendeeRow,
  EventAttendeesListQuery,
  EventAttendeesListResult,
  EventAttendeesSummary,
  EventAttendeeSortField,
} from "@/lib/event-platform/attendees/event-attendees-types";
import {
  isCommandCenterValidRegistration,
} from "@/lib/event-platform/command-center/command-center-registration";
import { prisma } from "@/lib/prisma";

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

function checkInStatus(row: {
  bookingStatus: string;
  checkedInAt: Date | null;
}): EventAttendeeCheckInStatus {
  if (row.bookingStatus === "no_show") return "no_show";
  return row.checkedInAt ? "checked_in" : "not_checked_in";
}

function parsePageSize(v: number | undefined): 25 | 50 | 100 | 5000 {
  if (v === 50 || v === 100 || v === 5000) return v;
  return 25;
}

async function loadPlantRequestsByRegistration(
  organizationId: bigint,
  eventId: bigint,
): Promise<Map<string, { label: string; count: number }>> {
  const rows = await prisma.eventPlantRequest.findMany({
    where: { organizationId, eventId },
    include: { eventPlant: { select: { name: true } } },
  });
  const map = new Map<string, { label: string; count: number }>();
  for (const row of rows) {
    const id = row.registrationId.toString();
    const label = row.eventPlant?.name ?? row.requestedPlantName ?? "Plant request";
    const existing = map.get(id);
    if (existing) {
      existing.count += 1;
      if (!existing.label.includes(label)) existing.label = `${existing.label}, ${label}`;
    } else {
      map.set(id, { label, count: 1 });
    }
  }
  return map;
}

async function loadBingoWinCountsByRegistration(
  organizationId: bigint,
  eventId: bigint,
): Promise<Map<string, number>> {
  const rows = await prisma.eventBingoWinner.groupBy({
    by: ["registrationId"],
    where: { organizationId, eventId, invalidated: false },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.registrationId.toString(), r._count._all]));
}

async function loadLifetimeBingoWinCountsByUser(
  organizationId: bigint,
  userIds: bigint[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!userIds.length) return map;

  const winners = await prisma.eventBingoWinner.findMany({
    where: {
      organizationId,
      invalidated: false,
      registration: { studentUserId: { in: userIds } },
    },
    select: { registration: { select: { studentUserId: true } } },
  });

  for (const winner of winners) {
    const uid = winner.registration.studentUserId.toString();
    map.set(uid, (map.get(uid) ?? 0) + 1);
  }
  return map;
}

type EnrichedRow = EventAttendeeRow;

async function loadLifetimeByUser(
  organizationId: bigint,
  userIds: bigint[],
  currentEventId: bigint,
): Promise<
  Map<
    string,
    {
      registered: number;
      attended: number;
      spend: number;
      lastAttended: Date | null;
      favoriteVenue: string | null;
    }
  >
> {
  const map = new Map<
    string,
    {
      registered: number;
      attended: number;
      spend: number;
      lastAttended: Date | null;
      favoriteVenue: string | null;
    }
  >();
  if (!userIds.length) return map;

  const [regs, txRows, eventVenueCounts] = await Promise.all([
    prisma.lmsEventRegistration.findMany({
      where: {
        organizationId,
        studentUserId: { in: userIds },
        bookingStatus: { notIn: ["cancelled", "refunded"] },
      },
      select: {
        id: true,
        studentUserId: true,
        eventId: true,
        checkedInAt: true,
      },
    }),
    prisma.lmsEventTransaction.findMany({
      where: {
        organizationId,
        status: "completed",
        registration: { studentUserId: { in: userIds } },
      },
      select: { registrationId: true, amount: true },
    }),
    prisma.lmsEventRegistration.findMany({
      where: {
        organizationId,
        studentUserId: { in: userIds },
        checkedInAt: { not: null },
        bookingStatus: { notIn: ["cancelled", "refunded"] },
      },
      select: {
        studentUserId: true,
        event: { select: { venueName: true } },
      },
    }),
  ]);

  const regIdToUser = new Map(regs.map((r) => [r.id.toString(), r.studentUserId.toString()]));

  for (const uid of userIds) {
    map.set(uid.toString(), {
      registered: 0,
      attended: 0,
      spend: 0,
      lastAttended: null,
      favoriteVenue: null,
    });
  }

  for (const reg of regs) {
    const key = reg.studentUserId.toString();
    const entry = map.get(key)!;
    entry.registered += 1;
    if (reg.checkedInAt) {
      entry.attended += 1;
      if (!entry.lastAttended || reg.checkedInAt > entry.lastAttended) {
        entry.lastAttended = reg.checkedInAt;
      }
    }
  }

  for (const tx of txRows) {
    const uid = regIdToUser.get(tx.registrationId.toString());
    if (!uid) continue;
    const entry = map.get(uid);
    if (entry) entry.spend += num(tx.amount);
  }

  const venueByUser = new Map<string, Map<string, number>>();
  for (const row of eventVenueCounts) {
    const venue = row.event.venueName?.trim();
    if (!venue) continue;
    const uid = row.studentUserId.toString();
    const counts = venueByUser.get(uid) ?? new Map();
    counts.set(venue, (counts.get(venue) ?? 0) + 1);
    venueByUser.set(uid, counts);
  }

  for (const [uid, entry] of map) {
    const venues = venueByUser.get(uid);
    if (!venues) continue;
    let bestVenue: string | null = null;
    let bestCount = 0;
    for (const [name, count] of venues) {
      if (count > bestCount) {
        bestVenue = name;
        bestCount = count;
      }
    }
    entry.favoriteVenue = bestVenue;
  }

  void currentEventId;
  return map;
}

async function buildRowsForEvent(
  organizationId: bigint,
  eventId: bigint,
): Promise<{
  rows: EnrichedRow[];
  bonusCounts: number[];
  ticketTiers: Array<{ id: string; name: string }>;
  sources: Set<string>;
}> {
  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { cardsIncluded: true, currency: true },
  });
  if (!event) return { rows: [], bonusCounts: [], ticketTiers: [], sources: new Set() };

  const [registrations, tickets, commissionRegs, bingoWinsByReg, plantRequestsByReg] = await Promise.all([
    prisma.lmsEventRegistration.findMany({
      where: { organizationId, eventId },
      include: {
        ticket: true,
        student: { select: { id: true, mobileNo: true, avatar: true, referralSource: true } },
        transactions: true,
      },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.lmsEventTicket.findMany({
      where: { organizationId, eventId },
      select: { id: true, name: true, price: true, description: true },
    }),
    prisma.eventCommissionLedger.findMany({
      where: { organizationId, eventId, registrationId: { not: null } },
      select: { registrationId: true },
    }),
    loadBingoWinCountsByRegistration(organizationId, eventId),
    loadPlantRequestsByRegistration(organizationId, eventId),
  ]);

  const affiliateRegIds = new Set(
    commissionRegs.map((c) => c.registrationId?.toString()).filter(Boolean) as string[],
  );

  const bonusTicket = tickets.find((t) => isBonusTicketRow(t)) ?? null;
  const bonusUnitPrice = bonusTicket ? num(bonusTicket.price) : 0;
  const includedDefault = event.cardsIncluded ?? 0;
  const ticketTiers = tickets.filter((t) => !isBonusTicketRow(t)).map((t) => ({
    id: t.id.toString(),
    name: t.name,
  }));

  const userIds = [...new Set(registrations.map((r) => r.studentUserId))];
  const lifetime = await loadLifetimeByUser(organizationId, userIds, eventId);

  const priorCountByUser = new Map<string, number>();
  for (const uid of userIds) {
    const all = lifetime.get(uid.toString())?.registered ?? 0;
    const current = registrations.filter((r) => r.studentUserId === uid).length;
    priorCountByUser.set(uid.toString(), Math.max(0, all - current));
  }

  const sources = new Set<string>();
  const draftRows: EnrichedRow[] = [];

  for (const reg of registrations) {
    const { firstName, lastName } = splitAttendeeName(reg.attendeeName);
    const isBonusPrimary = isBonusTicketRow(reg.ticket);
    const primaryPrice = reg.ticket ? num(reg.ticket.price) : num(reg.amountPaid);
    const txRows = reg.transactions.map((t) => ({ amount: num(t.amount), status: t.status }));
    const bonusCalc = computeBonusCardCount({
      isBonusPrimaryTicket: isBonusPrimary,
      bonusUnitPrice,
      primaryTicketPrice: primaryPrice,
      transactions: txRows,
    });

    const completedSpend = reg.transactions
      .filter((t) => t.status === "completed")
      .reduce((s, t) => s + num(t.amount), 0);
    const totalSpend = completedSpend > 0 ? completedSpend : num(reg.amountPaid);

    const firstTx = reg.transactions.find((t) => t.status === "completed");
    const registrationSource = formatRegistrationSource(firstTx?.method ?? "online");
    sources.add(registrationSource);

    const uid = reg.studentUserId.toString();
    const priorEvents = priorCountByUser.get(uid) ?? 0;
    let customerType: EventAttendeeCustomerType = priorEvents === 0 ? "new" : "returning";
    if (reg.student.referralSource?.trim() || affiliateRegIds.has(reg.id.toString())) {
      customerType = "affiliate_referral";
    }

    const includedCards = isBonusPrimary ? 0 : includedDefault;
    const checkIn = checkInStatus(reg);
    const bingoWinCount = bingoWinsByReg.get(reg.id.toString()) ?? 0;
    const plantReq = plantRequestsByReg.get(reg.id.toString());

    draftRows.push({
      registrationId: reg.id.toString(),
      studentUserId: uid,
      firstName,
      lastName,
      fullName: reg.attendeeName,
      email: reg.attendeeEmail,
      phone: reg.student.mobileNo ?? null,
      avatarUrl: reg.student.avatar ?? null,
      initials: attendeeInitials(firstName, lastName, reg.attendeeEmail),
      bookingStatus: reg.bookingStatus,
      checkInStatus: checkIn,
      checkedInAt: reg.checkedInAt?.toISOString() ?? null,
      ticketId: reg.ticketId?.toString() ?? null,
      ticketName: reg.ticket?.name ?? "—",
      ticketQuantity: 1,
      includedCards,
      bonusCards: bonusCalc.count,
      totalCards: includedCards + bonusCalc.count,
      bingoWins: "available",
      bingoWinCount,
      totalSpend: Math.round(totalSpend * 100) / 100,
      currency: reg.currency,
      plantRequest: plantReq
        ? { availability: "available", value: plantReq.label }
        : { availability: "no_records", value: null },
      registrationSource,
      customerType,
      bonus: {
        tier: "none",
        count: bonusCalc.count,
        revenue: Math.round(bonusCalc.revenue * 100) / 100,
        eventAverage: null,
        showBadge: false,
      },
      registeredAt: reg.registeredAt.toISOString(),
      qrToken: reg.qrToken,
      priorEventsRegistered: priorEvents,
      priorEventsAttended: lifetime.get(uid)?.attended ?? 0,
    });
  }

  const bonusCounts = draftRows.map((r) => r.bonusCards);
  const buyerCounts = bonusCounts.filter((c) => c > 0);
  const buyerAverage =
    buyerCounts.length > 0
      ? Math.round((buyerCounts.reduce((a, b) => a + b, 0) / buyerCounts.length) * 100) / 100
      : null;
  const powerThreshold = computePowerBuyerThreshold(bonusCounts);

  for (const row of draftRows) {
    const { tier, showBadge } = classifyBonusTier({
      count: row.bonusCards,
      buyerAverage,
      powerThreshold,
    });
    row.bonus = {
      ...row.bonus,
      tier,
      showBadge,
      eventAverage: buyerAverage,
    };
  }

  return { rows: draftRows, bonusCounts, ticketTiers, sources };
}

function applyFilters(rows: EnrichedRow[], query: EventAttendeesListQuery): EnrichedRow[] {
  let result = [...rows];

  const q = query.q?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone?.toLowerCase().includes(q) ?? false),
    );
  }

  const phone = query.phone?.trim();
  if (phone) {
    result = result.filter((r) => r.phone?.includes(phone));
  }

  const email = query.email?.trim().toLowerCase();
  if (email) {
    result = result.filter((r) => r.email.toLowerCase().includes(email));
  }

  if (query.registrationStatus && query.registrationStatus !== "all") {
    result = result.filter((r) => r.bookingStatus === query.registrationStatus);
  }

  if (query.checkInStatus && query.checkInStatus !== "all") {
    result = result.filter((r) => r.checkInStatus === query.checkInStatus);
  }

  if (query.newOrReturning && query.newOrReturning !== "all") {
    result = result.filter((r) =>
      query.newOrReturning === "new" ? r.customerType === "new" : r.customerType === "returning",
    );
  }

  if (query.customerType && query.customerType !== "all") {
    result = result.filter((r) => r.customerType === query.customerType);
  }

  if (query.ticketTierId && query.ticketTierId !== "all") {
    result = result.filter((r) => r.ticketId === query.ticketTierId);
  }

  if (query.bonusCardBuyer === "true") {
    result = result.filter((r) => r.bonusCards > 0);
  } else if (query.bonusCardBuyer === "false") {
    result = result.filter((r) => r.bonusCards === 0);
  }

  if (query.bingoWinner === "true") {
    result = result.filter((r) => r.bingoWinCount > 0);
  } else if (query.bingoWinner === "false") {
    result = result.filter((r) => r.bingoWinCount === 0);
  }

  if (query.hasPlantRequest === "true") {
    result = result.filter((r) => r.plantRequest.availability === "available");
  } else if (query.hasPlantRequest === "false") {
    result = result.filter((r) => r.plantRequest.availability !== "available");
  }

  if (query.registrationSource && query.registrationSource !== "all") {
    result = result.filter((r) => r.registrationSource === query.registrationSource);
  }

  if (query.spendMin != null && Number.isFinite(query.spendMin)) {
    result = result.filter((r) => r.totalSpend >= query.spendMin!);
  }
  if (query.spendMax != null && Number.isFinite(query.spendMax)) {
    result = result.filter((r) => r.totalSpend <= query.spendMax!);
  }

  return result;
}

function sortRows(rows: EnrichedRow[], sort: EventAttendeeSortField, dir: "asc" | "desc"): EnrichedRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "bonus_cards":
        return (a.bonusCards - b.bonusCards) * mul;
      case "spend":
        return (a.totalSpend - b.totalSpend) * mul;
      case "bingo_wins":
        return (a.bingoWinCount - b.bingoWinCount) * mul;
      case "events_attended":
        return (a.priorEventsAttended - b.priorEventsAttended) * mul;
      case "name":
        return a.fullName.localeCompare(b.fullName) * mul;
      case "registered_at":
      default:
        return (new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()) * mul;
    }
  });
}

function buildSummary(rows: EnrichedRow[], buyerAverage: number | null): EventAttendeesSummary {
  const valid = rows.filter((r) => isCommandCenterValidRegistration(r.bookingStatus));
  const winnerCount = valid.filter((r) => r.bingoWinCount > 0).length;
  return {
    totalAttendees: valid.length,
    checkedIn: valid.filter((r) => r.checkInStatus === "checked_in").length,
    notCheckedIn: valid.filter((r) => r.checkInStatus === "not_checked_in").length,
    newAttendees: valid.filter((r) => r.customerType === "new").length,
    returningAttendees: valid.filter((r) => r.customerType === "returning").length,
    walkIns: "not_configured",
    walkInCount: null,
    bonusCardBuyers: valid.filter((r) => r.bonusCards > 0).length,
    bingoWinners: winnerCount > 0 ? "available" : "no_records",
    bingoWinnerCount: winnerCount,
    noShows: rows.filter((r) => r.bookingStatus === "no_show").length,
    bonusCardEventAverage: buyerAverage,
  };
}

export async function listEventAttendees(
  organizationId: bigint,
  eventIdRaw: string,
  query: EventAttendeesListQuery,
): Promise<EventAttendeesListResult | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const exists = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true },
  });
  if (!exists) return null;

  const { rows: allRows, ticketTiers, sources } = await buildRowsForEvent(organizationId, eventId);
  const buyerAverage =
    allRows.filter((r) => r.bonusCards > 0).length > 0
      ? allRows.filter((r) => r.bonusCards > 0).reduce((s, r) => s + r.bonusCards, 0) /
        allRows.filter((r) => r.bonusCards > 0).length
      : null;

  const filtered = applyFilters(allRows, query);
  const sort = query.sort ?? "registered_at";
  const sortDir = query.sortDir ?? "desc";
  const sorted = sortRows(filtered, sort, sortDir);

  const pageSize = parsePageSize(query.pageSize);
  const page = Math.max(1, query.page ?? 1);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  return {
    summary: buildSummary(allRows, buyerAverage != null ? Math.round(buyerAverage * 100) / 100 : null),
    rows: pageRows,
    total,
    page: safePage,
    pageSize,
    totalPages,
    ticketTiers,
    registrationSources: [...sources].sort(),
  };
}

export async function getEventAttendeeDetail(
  organizationId: bigint,
  eventIdRaw: string,
  registrationIdRaw: string,
): Promise<EventAttendeeDetail | null> {
  let eventId: bigint;
  let registrationId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
    registrationId = BigInt(registrationIdRaw);
  } catch {
    return null;
  }

  const { rows } = await buildRowsForEvent(organizationId, eventId);
  const row = rows.find((r) => r.registrationId === registrationIdRaw);
  if (!row) return null;

  const lifetimeMap = await loadLifetimeByUser(organizationId, [BigInt(row.studentUserId)], eventId);
  const life = lifetimeMap.get(row.studentUserId);

  const reg = await prisma.lmsEventRegistration.findFirst({
    where: { id: registrationId, organizationId, eventId },
    include: { transactions: { orderBy: { processedAt: "asc" } } },
  });
  if (!reg) return null;

  const [lifetimeBingoWins, eventWins] = await Promise.all([
    loadLifetimeBingoWinCountsByUser(organizationId, [BigInt(row.studentUserId)]),
    prisma.eventBingoWinner.findMany({
      where: {
        organizationId,
        eventId,
        registrationId,
        invalidated: false,
      },
      include: { roundInstance: { select: { roundNumber: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const lifetimeWinCount = lifetimeBingoWins.get(row.studentUserId) ?? row.bingoWinCount;

  const activity: EventAttendeeActivityItem[] = [
    {
      id: `reg-${reg.id}`,
      at: reg.registeredAt.toISOString(),
      kind: "registration",
      title: "Registered",
      detail: `${row.ticketName} · ${row.bookingStatus.replace(/_/g, " ")}`,
    },
  ];

  for (const tx of reg.transactions) {
    activity.push({
      id: `tx-${tx.id}`,
      at: tx.processedAt.toISOString(),
      kind: "payment",
      title: "Payment",
      detail: `${num(tx.amount).toFixed(2)} ${tx.currency} · ${tx.status}`,
    });
  }

  if (reg.checkedInAt) {
    activity.push({
      id: `ci-${reg.id}`,
      at: reg.checkedInAt.toISOString(),
      kind: "check_in",
      title: "Checked in",
      detail: "Attendee checked in at the door",
    });
  }

  if (row.bonusCards > 0) {
    activity.push({
      id: `bonus-${reg.id}`,
      at: reg.registeredAt.toISOString(),
      kind: "bonus",
      title: "Bonus cards",
      detail: `${row.bonusCards} bonus card(s) · ${row.bonus.revenue.toFixed(2)} ${row.currency}`,
    });
  }

  for (const win of eventWins) {
    activity.push({
      id: `win-${win.id}`,
      at: win.createdAt.toISOString(),
      kind: "win",
      title: "Bingo win",
      detail: `Round ${win.roundInstance.roundNumber} · ${win.prizeLabel} · card ${win.winningCardNumber}`,
    });
  }

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    row,
    notes: null,
    lifetime: {
      totalEventsRegistered: life?.registered ?? 1,
      totalEventsAttended: life?.attended ?? 0,
      lifetimeSpend: Math.round((life?.spend ?? row.totalSpend) * 100) / 100,
      lifetimeBonusCards: row.bonusCards,
      lifetimeBingoWins: lifetimeWinCount > 0 ? "available" : "no_records",
      lifetimeBingoWinCount: lifetimeWinCount,
      plantsWon: "not_configured",
      plantsWonCount: null,
      favoriteVenue: life?.favoriteVenue ?? null,
      favoritePlant: "not_configured",
      referralCount: row.customerType === "affiliate_referral" ? 1 : 0,
      lastEventAttended: life?.lastAttended?.toISOString() ?? null,
    },
    activity,
  };
}

export function eventAttendeesToCsv(rows: EventAttendeeRow[]): string {
  const headers = [
    "First Name",
    "Last Name",
    "Phone",
    "Email",
    "Tickets",
    "Included Cards",
    "Bonus Cards",
    "Total Cards",
    "Bingo Wins",
    "Spend",
    "Plant Request",
    "Check-In Status",
    "Registration Source",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.firstName),
        csvCell(r.lastName),
        csvCell(r.phone ?? ""),
        csvCell(r.email),
        csvCell(r.ticketName),
        String(r.includedCards),
        String(r.bonusCards),
        String(r.totalCards),
        r.bingoWins === "not_configured" ? "" : String(r.bingoWinCount),
        String(r.totalSpend),
        r.plantRequest.availability === "not_configured" ? "" : (r.plantRequest.value ?? ""),
        r.checkInStatus.replace(/_/g, " "),
        csvCell(r.registrationSource),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportEventAttendees(
  organizationId: bigint,
  eventIdRaw: string,
  query: EventAttendeesListQuery,
): Promise<{ csv: string; filename: string } | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const exists = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true },
  });
  if (!exists) return null;

  const { rows: allRows } = await buildRowsForEvent(organizationId, eventId);
  const filtered = sortRows(
    applyFilters(allRows, query),
    query.sort ?? "registered_at",
    query.sortDir ?? "desc",
  );

  return {
    csv: eventAttendeesToCsv(filtered),
    filename: `event-${eventIdRaw}-attendees.csv`,
  };
}
