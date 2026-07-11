import "server-only";

import { Prisma } from "@prisma/client";

import type { EventBingoRoundAction, EventBingoRoundStatus } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import type {
  EventBingoRoundDto,
  EventBingoWinnerDto,
  EventGamesOverview,
  RecordWinnerInput,
  RecordWinnerResult,
} from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import { validateRecordWinner } from "@/lib/event-platform/bingo-rounds/bingo-winner-validation";
import { orderBingoGamesByIds } from "@/lib/event-platform/bingo-games/bingo-game-types";
import { listEventBingoGames, serializeEventBingoGame } from "@/lib/event-platform/bingo-games/bingo-game-service";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { csvFromRows } from "@/lib/event-platform/export/csv-utils";
import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import { prisma } from "@/lib/prisma";

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function checkInStatus(bookingStatus: string, checkedInAt: Date | null): EventBingoWinnerDto["checkInStatus"] {
  if (bookingStatus === "no_show") return "no_show";
  return checkedInAt ? "checked_in" : "not_checked_in";
}

function serializeWinner(
  row: Prisma.EventBingoWinnerGetPayload<{
    include: {
      registration: { include: { ticket: true } };
      roundInstance: true;
      verifiedBy: { select: { name: true } };
    };
  }>,
  priorEventCountByUser: Map<string, number>,
): EventBingoWinnerDto {
  const uid = row.registration.studentUserId.toString();
  const prior = priorEventCountByUser.get(uid) ?? 0;
  return {
    id: row.id.toString(),
    eventId: row.eventId.toString(),
    roundInstanceId: row.roundInstanceId.toString(),
    roundNumber: row.roundInstance.roundNumber,
    registrationId: row.registrationId.toString(),
    attendeeName: row.registration.attendeeName,
    attendeeEmail: row.registration.attendeeEmail,
    winningCardNumber: row.winningCardNumber,
    cardType: row.cardType as EventBingoWinnerDto["cardType"],
    prizeLabel: row.prizeLabel,
    prizeCost: row.prizeCost != null ? num(row.prizeCost) : null,
    prizeRetailValue: row.prizeRetailValue != null ? num(row.prizeRetailValue) : null,
    verified: row.verified,
    verifiedAt: iso(row.verifiedAt),
    verifiedByName: row.verifiedBy?.name ?? null,
    verificationNotes: row.verificationNotes,
    winnerPhotoUrl: row.winnerPhotoUrl,
    notes: row.notes,
    checkInStatus: checkInStatus(row.registration.bookingStatus, row.registration.checkedInAt),
    bookingStatus: row.registration.bookingStatus,
    ticketName: row.registration.ticket?.name ?? null,
    customerType: prior === 0 ? "new" : "returning",
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeRound(
  row: Prisma.EventBingoRoundInstanceGetPayload<{ include: { winners: true } }>,
  winnerDtos: Map<string, EventBingoWinnerDto>,
): EventBingoRoundDto {
  const active = row.winners.filter((w) => !w.invalidated);
  const primary = active[0];
  return {
    id: row.id.toString(),
    eventId: row.eventId.toString(),
    roundNumber: row.roundNumber,
    bingoGameId: row.bingoGameId?.toString() ?? null,
    name: row.name,
    pattern: row.pattern,
    difficulty: row.difficulty,
    assignedPrize: row.assignedPrize,
    prizeCost: row.prizeCost != null ? num(row.prizeCost) : null,
    prizeRetailValue: row.prizeRetailValue != null ? num(row.prizeRetailValue) : null,
    scheduledAt: iso(row.scheduledAt),
    actualStartAt: iso(row.actualStartAt),
    actualEndAt: iso(row.actualEndAt),
    status: row.status as EventBingoRoundStatus,
    primaryWinner: primary ? (winnerDtos.get(primary.id.toString()) ?? null) : null,
    winnerCount: active.length,
  };
}

export async function syncEventBingoRounds(
  organizationId: bigint,
  eventId: bigint,
  actorUserId?: bigint,
): Promise<void> {
  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { detailContent: true, startsAt: true },
  });
  if (!event) return;

  const detail = parseDetailContent(event.detailContent);
  const rounds = detail?.bingoRounds ?? [];
  const gameIds = detail?.bingoGameIds ?? [];

  const library = (await listEventBingoGames(organizationId)).map(serializeEventBingoGame);
  const orderedGames = gameIds.length ? orderBingoGamesByIds(library, gameIds) : [];

  const existing = await prisma.eventBingoRoundInstance.findMany({
    where: { organizationId, eventId },
    select: { roundNumber: true },
  });
  const existingNums = new Set(existing.map((r) => r.roundNumber));

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const game = orderedGames[i] ?? orderedGames.find((g) => g.name === round.name);
    if (existingNums.has(round.roundNumber)) continue;

    await prisma.eventBingoRoundInstance.create({
      data: {
        organizationId,
        eventId,
        roundNumber: round.roundNumber,
        bingoGameId: game ? BigInt(game.id) : null,
        name: round.name,
        pattern: round.pattern,
        difficulty: round.difficulty,
        assignedPrize: round.prize,
        status: "scheduled",
        scheduledAt: event.startsAt,
        createdById: actorUserId ?? null,
        updatedById: actorUserId ?? null,
      },
    });
  }
}

async function priorEventCounts(organizationId: bigint, userIds: bigint[], eventId: bigint) {
  const map = new Map<string, number>();
  if (!userIds.length) return map;
  const rows = await prisma.lmsEventRegistration.groupBy({
    by: ["studentUserId"],
    where: {
      organizationId,
      studentUserId: { in: userIds },
      eventId: { not: eventId },
      bookingStatus: { notIn: ["cancelled", "refunded"] },
    },
    _count: { _all: true },
  });
  for (const row of rows) {
    map.set(row.studentUserId.toString(), row._count._all);
  }
  return map;
}

function buildAnalytics(
  winners: EventBingoWinnerDto[],
  rounds: EventBingoRoundDto[],
): EventGamesOverview["analytics"] {
  const byCard = new Map<string, number>();
  const byTicket = new Map<string, number>();
  const byCustomer = new Map<string, number>();
  const byPattern = new Map<string, number>();
  const regIds = new Set<string>();
  let repeat = 0;

  for (const w of winners) {
    byCard.set(w.cardType, (byCard.get(w.cardType) ?? 0) + 1);
    const ticket = w.ticketName ?? "Unknown";
    byTicket.set(ticket, (byTicket.get(ticket) ?? 0) + 1);
    const ct = w.customerType ?? "unknown";
    byCustomer.set(ct, (byCustomer.get(ct) ?? 0) + 1);
    const round = rounds.find((r) => r.id === w.roundInstanceId);
    if (round) byPattern.set(round.pattern, (byPattern.get(round.pattern) ?? 0) + 1);
    if (regIds.has(w.registrationId)) repeat += 1;
    regIds.add(w.registrationId);
  }

  const cardLabels: Record<string, string> = {
    included: "Included card",
    bonus: "Bonus card",
    promotional: "Promotional",
    staff: "Staff-issued",
    other: "Other",
  };

  return {
    winsByCardType: [...byCard.entries()].map(([key, count]) => ({
      key,
      label: cardLabels[key] ?? key,
      count,
    })),
    winsByTicketTier: [...byTicket.entries()].map(([key, count]) => ({ key, label: key, count })),
    winsByCustomerType: [...byCustomer.entries()].map(([key, count]) => ({
      key,
      label: key === "new" ? "New" : key === "returning" ? "Returning" : key,
      count,
    })),
    newVsReturning: {
      new: winners.filter((w) => w.customerType === "new").length,
      returning: winners.filter((w) => w.customerType === "returning").length,
    },
    uniqueVsRepeat: { unique: regIds.size, repeat },
    winsByPattern: [...byPattern.entries()].map(([key, count]) => ({
      key,
      label: key.length > 40 ? `${key.slice(0, 40)}…` : key,
      count,
    })),
  };
}

function buildSummary(rounds: EventBingoRoundDto[], winners: EventBingoWinnerDto[]): EventGamesOverview["summary"] {
  const regIds = winners.map((w) => w.registrationId);
  const unique = new Set(regIds).size;
  const repeat = regIds.length - unique;
  return {
    totalRounds: rounds.length,
    completedRounds: rounds.filter((r) => r.status === "completed").length,
    upcomingRounds: rounds.filter((r) => ["scheduled", "ready"].includes(r.status)).length,
    inProgressRounds: rounds.filter((r) => ["in_progress", "paused", "winner_verification"].includes(r.status)).length,
    totalWinners: winners.length,
    uniqueWinners: unique,
    repeatWinners: repeat,
    prizesAwarded: winners.filter((w) => w.verified || w.prizeLabel).length,
    totalPrizeCost: winners.reduce((s, w) => s + (w.prizeCost ?? 0), 0),
    totalPrizeRetailValue: winners.reduce((s, w) => s + (w.prizeRetailValue ?? 0), 0),
  };
}

export async function getEventGamesOverview(
  organizationId: bigint,
  eventIdRaw: string,
  actorUserId?: bigint,
  options?: { canManageGames?: boolean },
): Promise<EventGamesOverview | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true },
  });
  if (!event) return null;

  await syncEventBingoRounds(organizationId, eventId, actorUserId);

  const [roundRows, winnerRows, auditRows] = await Promise.all([
    prisma.eventBingoRoundInstance.findMany({
      where: { organizationId, eventId },
      include: { winners: true },
      orderBy: { roundNumber: "asc" },
    }),
    prisma.eventBingoWinner.findMany({
      where: { organizationId, eventId, invalidated: false },
      include: {
        registration: { include: { ticket: true } },
        roundInstance: true,
        verifiedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventAuditLog.findMany({
      where: {
        organizationId,
        entityId: eventId.toString(),
        entityType: { in: ["event_bingo_round", "event_bingo_winner"] },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const userIds = [...new Set(winnerRows.map((w) => w.registration.studentUserId))];
  const priorMap = await priorEventCounts(organizationId, userIds, eventId);

  const winnerDtos = winnerRows.map((w) => serializeWinner(w, priorMap));
  const winnerById = new Map(winnerDtos.map((w) => [w.id, w]));
  const rounds = roundRows.map((r) => serializeRound(r, winnerById));

  const current = roundRows.find((r) => r.status === "in_progress" || r.status === "paused");

  const activity: EventGamesOverview["activity"] = auditRows.map((log) => ({
    id: log.id.toString(),
    at: log.createdAt.toISOString(),
    action: log.action,
    title: log.action.replace(/\./g, " "),
    detail: log.entityType.replace(/_/g, " "),
  }));

  return {
    summary: buildSummary(rounds, winnerDtos),
    rounds,
    winners: winnerDtos,
    analytics: buildAnalytics(winnerDtos, rounds),
    activity,
    currentRoundId: current?.id.toString() ?? null,
    canManageGames: options?.canManageGames ?? false,
  };
}

const ACTION_STATUS: Record<EventBingoRoundAction, EventBingoRoundStatus | null> = {
  start: "in_progress",
  pause: "paused",
  resume: "in_progress",
  complete: "completed",
  cancel: "cancelled",
  verify_winner: "winner_verification",
};

export async function applyRoundAction(input: {
  organizationId: bigint;
  eventId: bigint;
  roundId: bigint;
  action: EventBingoRoundAction;
  actorUserId?: bigint;
  prizePatch?: { assignedPrize?: string; prizeCost?: number | null; prizeRetailValue?: number | null };
}): Promise<EventBingoRoundDto | null> {
  const round = await prisma.eventBingoRoundInstance.findFirst({
    where: { id: input.roundId, organizationId: input.organizationId, eventId: input.eventId },
    include: { winners: true },
  });
  if (!round) return null;

  const nextStatus = ACTION_STATUS[input.action];
  const now = new Date();
  const data: Prisma.EventBingoRoundInstanceUpdateInput = {
    updatedById: input.actorUserId ?? null,
  };

  if (input.prizePatch?.assignedPrize != null) data.assignedPrize = input.prizePatch.assignedPrize;
  if (input.prizePatch?.prizeCost !== undefined) {
    data.prizeCost = input.prizePatch.prizeCost == null ? null : input.prizePatch.prizeCost;
  }
  if (input.prizePatch?.prizeRetailValue !== undefined) {
    data.prizeRetailValue = input.prizePatch.prizeRetailValue == null ? null : input.prizePatch.prizeRetailValue;
  }

  if (nextStatus) data.status = nextStatus;
  if (input.action === "start" || input.action === "resume") {
    data.actualStartAt = round.actualStartAt ?? now;
  }
  if (input.action === "complete" || input.action === "cancel") {
    data.actualEndAt = now;
  }

  const updated = await prisma.eventBingoRoundInstance.update({
    where: { id: round.id },
    data,
    include: { winners: true },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: `bingo_round.${input.action}`,
    entityType: "event_bingo_round",
    entityId: updated.id.toString(),
    metadata: { eventId: input.eventId.toString(), roundNumber: updated.roundNumber },
  });

  return serializeRound(updated, new Map());
}

export async function recordEventBingoWinner(input: {
  organizationId: bigint;
  eventId: bigint;
  data: RecordWinnerInput;
  actorUserId?: bigint;
  force?: boolean;
}): Promise<RecordWinnerResult | { error: string; validation: RecordWinnerResult["validation"] }> {
  let roundId: bigint;
  let registrationId: bigint;
  try {
    roundId = BigInt(input.data.roundInstanceId);
    registrationId = BigInt(input.data.registrationId);
  } catch {
    return { error: "Invalid round or registration.", validation: { ok: false, errors: ["Invalid IDs."], warnings: [] } };
  }

  const [round, registration, allWinners] = await Promise.all([
    prisma.eventBingoRoundInstance.findFirst({
      where: { id: roundId, organizationId: input.organizationId, eventId: input.eventId },
    }),
    prisma.lmsEventRegistration.findFirst({
      where: { id: registrationId, organizationId: input.organizationId, eventId: input.eventId },
    }),
    prisma.eventBingoWinner.findMany({
      where: { organizationId: input.organizationId, eventId: input.eventId },
      include: { roundInstance: { select: { status: true } } },
    }),
  ]);

  if (!round) {
    return { error: "Round not found.", validation: { ok: false, errors: ["Round not found."], warnings: [] } };
  }

  const validation = validateRecordWinner({
    round,
    registration,
    input: input.data,
    existingWinners: allWinners.map((w) => ({
      id: w.id,
      registrationId: w.registrationId,
      winningCardNumber: w.winningCardNumber,
      invalidated: w.invalidated,
      roundInstanceId: w.roundInstanceId,
      prizeLabel: w.prizeLabel,
      roundStatus: w.roundInstance.status,
    })),
  });

  if (!validation.ok && !input.force) {
    return { error: validation.errors[0] ?? "Validation failed.", validation };
  }

  const verified = Boolean(input.data.verified);
  const row = await prisma.eventBingoWinner.create({
    data: {
      organizationId: input.organizationId,
      eventId: input.eventId,
      roundInstanceId: round.id,
      bingoGameId: round.bingoGameId,
      registrationId,
      winningCardNumber: input.data.winningCardNumber.trim(),
      cardType: input.data.cardType,
      prizeLabel: input.data.prizeLabel.trim() || round.assignedPrize,
      prizeCost: input.data.prizeCost ?? round.prizeCost,
      prizeRetailValue: input.data.prizeRetailValue ?? round.prizeRetailValue,
      verified,
      verifiedById: verified ? (input.actorUserId ?? null) : null,
      verifiedAt: verified ? new Date() : null,
      winnerPhotoUrl: input.data.winnerPhotoUrl ?? null,
      notes: input.data.notes ?? null,
      createdById: input.actorUserId ?? null,
      updatedById: input.actorUserId ?? null,
    },
    include: {
      registration: { include: { ticket: true } },
      roundInstance: true,
      verifiedBy: { select: { name: true } },
    },
  });

  await prisma.eventBingoRoundInstance.update({
    where: { id: round.id },
    data: { status: verified ? "completed" : "winner_verification", updatedById: input.actorUserId ?? null },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "bingo_winner.recorded",
    entityType: "event_bingo_winner",
    entityId: row.id.toString(),
    metadata: { eventId: input.eventId.toString(), roundNumber: round.roundNumber },
  });

  const priorMap = await priorEventCounts(input.organizationId, [row.registration.studentUserId], input.eventId);
  return {
    winner: serializeWinner(row, priorMap),
    validation,
  };
}

export async function verifyEventBingoWinner(input: {
  organizationId: bigint;
  eventId: bigint;
  winnerId: bigint;
  actorUserId?: bigint;
  verificationNotes?: string | null;
  completeRound?: boolean;
}): Promise<EventBingoWinnerDto | null> {
  const existing = await prisma.eventBingoWinner.findFirst({
    where: {
      id: input.winnerId,
      organizationId: input.organizationId,
      eventId: input.eventId,
      invalidated: false,
    },
    include: {
      registration: { include: { ticket: true } },
      roundInstance: true,
      verifiedBy: { select: { name: true } },
    },
  });
  if (!existing) return null;

  const updated = await prisma.eventBingoWinner.update({
    where: { id: existing.id },
    data: {
      verified: true,
      verifiedById: input.actorUserId ?? null,
      verifiedAt: new Date(),
      verificationNotes: input.verificationNotes ?? existing.verificationNotes,
      updatedById: input.actorUserId ?? null,
    },
    include: {
      registration: { include: { ticket: true } },
      roundInstance: true,
      verifiedBy: { select: { name: true } },
    },
  });

  if (input.completeRound !== false) {
    await prisma.eventBingoRoundInstance.update({
      where: { id: existing.roundInstanceId },
      data: { status: "completed", actualEndAt: new Date(), updatedById: input.actorUserId ?? null },
    });
  }

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "bingo_winner.verified",
    entityType: "event_bingo_winner",
    entityId: updated.id.toString(),
  });

  const priorMap = await priorEventCounts(
    input.organizationId,
    [updated.registration.studentUserId],
    input.eventId,
  );
  return serializeWinner(updated, priorMap);
}

export function bingoWinnersToCsv(winners: EventBingoWinnerDto[]): string {
  return csvFromRows(
    ["Round", "Winner", "Email", "Card", "Card Type", "Prize", "Verified", "Created At"],
    winners.map((w) => [
      w.roundNumber,
      w.attendeeName,
      w.attendeeEmail,
      w.winningCardNumber,
      w.cardType,
      w.prizeLabel,
      w.verified ? "yes" : "no",
      w.createdAt,
    ]),
  );
}
