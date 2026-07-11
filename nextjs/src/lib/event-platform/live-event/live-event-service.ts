import "server-only";

import { filterValidRegistrations } from "@/lib/event-platform/command-center/command-center-registration";
import { getEventGamesOverview } from "@/lib/event-platform/bingo-rounds/bingo-round-service";
import { isBonusTicketRow } from "@/lib/event-platform/attendees/event-attendees-helpers";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  createWalkInRegistration,
  sellBonusCards,
  undoCheckIn,
} from "@/lib/event-platform/live-event/live-event-registration";
import type {
  LiveAnnouncementInput,
  LiveEventPermissions,
  LiveEventSnapshot,
  LiveIncidentInput,
  LiveInventoryWarning,
  WalkInInput,
} from "@/lib/event-platform/live-event/live-event-types";
import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import { prisma } from "@/lib/prisma";

const POLL_INTERVAL_MS = 15_000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function num(v: unknown): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

export function resolveLivePermissions(perms: string[]): LiveEventPermissions {
  const has = (p: string) => perms.includes(p) || perms.includes("manage-event-platform");
  return {
    checkIn: has("bookings.manage") || has("events.update"),
    undoCheckIn: has("events.update"),
    manageBookings: has("bookings.manage") || has("events.update"),
    manageGames: has("bingoGames.manage"),
    managePayments: has("payments.manage") || has("events.update"),
    sendAnnouncements: has("events.update"),
    addIncidents: has("events.update") || has("bookings.manage"),
  };
}

export async function getLiveEventSnapshot(
  organizationId: bigint,
  eventIdRaw: string,
  permissions: LiveEventPermissions,
): Promise<LiveEventSnapshot | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    include: {
      hostInvitations: { include: { host: true }, orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
  if (!event) return null;

  const detail = parseDetailContent(event.detailContent);
  const todayStart = startOfToday();

  const [registrations, tickets, games, plants, incidents, auditRows] = await Promise.all([
    prisma.lmsEventRegistration.findMany({
      where: { organizationId, eventId },
      include: { ticket: true, transactions: { where: { status: "completed" } } },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.lmsEventTicket.findMany({ where: { organizationId, eventId }, orderBy: { price: "asc" } }),
    getEventGamesOverview(organizationId, eventIdRaw, undefined, { canManageGames: permissions.manageGames }),
    prisma.eventPlant.findMany({
      where: { organizationId, eventId, status: { not: "removed" } },
      select: {
        id: true,
        name: true,
        quantityPurchased: true,
        quantityAssigned: true,
        quantityAwarded: true,
        quantityRemoved: true,
        status: true,
      },
    }),
    prisma.eventLiveIncident.findMany({
      where: { organizationId, eventId },
      include: { reportedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.eventAuditLog.findMany({
      where: {
        organizationId,
        OR: [{ eventId }, { entityType: "event", entityId: eventId.toString() }],
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, action: true, createdAt: true, metadataJson: true },
    }),
  ]);

  if (!games) return null;

  const validRegs = filterValidRegistrations(
    registrations.map((r) => ({
      bookingStatus: r.bookingStatus,
      paymentStatus: r.paymentStatus,
      registeredAt: r.registeredAt,
      checkedInAt: r.checkedInAt,
      amountPaid: num(r.amountPaid),
      ticketName: r.ticket?.name ?? null,
      attendeeName: r.attendeeName,
    })),
  );
  const regCount = validRegs.length;
  const checkedIn = validRegs.filter((r) => r.checkedInAt).length;
  const capacity = event.capacity;
  const remaining = capacity != null ? Math.max(0, capacity - regCount) : null;

  const walkIns = registrations.filter((r) => r.registrationSource === "walk_in").length;

  const regsToday = registrations.filter((r) => r.registeredAt >= todayStart);
  const ticketsSoldToday = regsToday.filter((r) => !isBonusTicketRow(r.ticket)).length;

  let bonusCardsSoldToday = 0;
  for (const r of registrations) {
    for (const tx of r.transactions) {
      if (tx.processedAt >= todayStart && isBonusTicketRow(r.ticket)) {
        bonusCardsSoldToday += 1;
      } else if (tx.processedAt >= todayStart && r.ticket && !isBonusTicketRow(r.ticket)) {
        const bonusTier = tickets.find((t) => isBonusTicketRow(t));
        if (bonusTier && Math.abs(num(tx.amount) - num(bonusTier.price)) < 0.02) {
          bonusCardsSoldToday += 1;
        }
      }
    }
  }

  const plantsRemaining = plants.reduce(
    (s, p) => s + Math.max(0, p.quantityPurchased - p.quantityAwarded - p.quantityRemoved),
    0,
  );

  const currentRound = games.currentRoundId
    ? games.rounds.find((r) => r.id === games.currentRoundId) ?? null
    : games.rounds.find((r) => ["in_progress", "paused", "winner_verification"].includes(r.status)) ?? null;

  const nextRound =
    games.rounds.find((r) => ["scheduled", "ready"].includes(r.status)) ??
    games.rounds.find((r) => r.status !== "completed" && r.status !== "cancelled" && r.id !== currentRound?.id) ??
    null;

  const recentCheckIns = registrations
    .filter((r) => r.checkedInAt)
    .sort((a, b) => b.checkedInAt!.getTime() - a.checkedInAt!.getTime())
    .slice(0, 12)
    .map((r) => ({
      registrationId: r.id.toString(),
      name: r.attendeeName,
      email: r.attendeeEmail,
      ticketName: r.ticket?.name ?? null,
      checkedInAt: r.checkedInAt!.toISOString(),
    }));

  const expectedAttendees = registrations
    .filter((r) => !r.checkedInAt && r.bookingStatus !== "cancelled" && r.bookingStatus !== "no_show")
    .slice(0, 15)
    .map((r) => ({
      registrationId: r.id.toString(),
      name: r.attendeeName,
      email: r.attendeeEmail,
      ticketName: r.ticket?.name ?? null,
    }));

  const inventoryWarnings: LiveInventoryWarning[] = [];
  for (const p of plants) {
    const left = Math.max(0, p.quantityPurchased - p.quantityAwarded - p.quantityRemoved);
    if (left <= 2 && left > 0) {
      inventoryWarnings.push({
        id: `plant-low-${p.id}`,
        severity: "warning",
        title: "Low plant inventory",
        message: `Only ${left} ${p.name} remaining.`,
      });
    }
    if (left === 0 && p.status !== "removed") {
      inventoryWarnings.push({
        id: `plant-out-${p.id}`,
        severity: "critical",
        title: "Plant out of stock",
        message: `${p.name} is no longer available for prizes.`,
      });
    }
  }

  const finalRound = games.rounds[games.rounds.length - 1];
  if (finalRound && !finalRound.assignedPrize?.trim() && finalRound.status !== "completed") {
    inventoryWarnings.push({
      id: "final-prize-missing",
      severity: "critical",
      title: "Final prize unavailable",
      message: "Final round has no prize assigned.",
    });
  }

  if (currentRound?.assignedPrize) {
    const prizePlant = plants.find((p) => p.name.toLowerCase() === currentRound.assignedPrize.toLowerCase());
    if (prizePlant) {
      const left = Math.max(0, prizePlant.quantityPurchased - prizePlant.quantityAwarded - prizePlant.quantityRemoved);
      if (left === 0) {
        inventoryWarnings.push({
          id: "current-prize-unavailable",
          severity: "critical",
          title: "Current prize unavailable",
          message: `Assigned prize "${currentRound.assignedPrize}" is out of stock.`,
        });
      }
    }
  }

  const acceptedHost = event.hostInvitations.find((i) => i.status === "accepted");
  const hostName =
    acceptedHost?.host.displayName?.trim() ||
    detail?.host?.name?.trim() ||
    event.instructorName?.trim() ||
    null;

  const bonusTier = tickets.find((t) => isBonusTicketRow(t));

  const schedule = buildLiveSchedule(event.startsAt, event.endsAt, event.doorsOpen, event.bingoStart, detail?.bingoEnd ?? null, games.rounds, currentRound?.id ?? null);

  return {
    eventId: eventId.toString(),
    eventName: event.title,
    eventStatus: event.status,
    venueName: event.venueName,
    hostName,
    startsAt: event.startsAt.toISOString(),
    timezone: event.timezone ?? "America/New_York",
    permissions,
    kpis: {
      registered: regCount,
      checkedIn,
      remaining,
      walkIns,
      ticketsSoldToday,
      bonusCardsSoldToday,
      currentRoundNumber: currentRound?.roundNumber ?? null,
      winners: games.summary.totalWinners,
      plantsRemaining,
    },
    currentRound,
    nextRound,
    rounds: games.rounds,
    recentWinners: games.winners.slice(0, 10),
    recentCheckIns,
    expectedAttendees,
    inventoryWarnings,
    schedule,
    staffActivity: auditRows.map((log) => ({
      id: log.id.toString(),
      at: log.createdAt.toISOString(),
      title: log.action.replace(/\./g, " "),
      detail:
        log.metadataJson && typeof log.metadataJson === "object" && "attendeeName" in (log.metadataJson as object)
          ? String((log.metadataJson as Record<string, unknown>).attendeeName)
          : "",
    })),
    incidents: incidents.map((i) => ({
      id: i.id.toString(),
      category: i.category,
      description: i.description,
      severity: i.severity,
      followUpStatus: i.followUpStatus,
      reportedByName: i.reportedBy?.name ?? null,
      registrationId: i.registrationId?.toString() ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
    ticketTiers: tickets.map((t) => ({
      id: t.id.toString(),
      name: t.name,
      price: num(t.price),
      currency: t.currency,
      isFree: t.isFree,
      isBonus: isBonusTicketRow(t),
      available: t.ticketStatus === "available" || t.ticketStatus === "on_sale",
    })),
    bonusUnitPrice: bonusTier ? num(bonusTier.price) : event.extraCardPrice != null ? num(event.extraCardPrice) : null,
    currency: event.currency ?? "USD",
    serverTime: new Date().toISOString(),
    pollIntervalMs: POLL_INTERVAL_MS,
  };
}

function buildLiveSchedule(
  startsAt: Date,
  endsAt: Date,
  doorsOpen: string | null,
  bingoStart: string | null,
  bingoEnd: string | null,
  rounds: LiveEventSnapshot["rounds"],
  currentRoundId: string | null,
): LiveEventSnapshot["schedule"] {
  const now = Date.now();
  const items: LiveEventSnapshot["schedule"] = [
    {
      id: "setup",
      label: "Setup",
      time: new Date(startsAt.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      sortAt: new Date(startsAt.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: "past",
    },
    {
      id: "doors-open",
      label: "Doors open",
      time: doorsOpen,
      sortAt: doorsOpen,
      status: doorsOpen && new Date(doorsOpen).getTime() <= now ? "past" : "upcoming",
    },
    {
      id: "bingo-start",
      label: "Bingo starts",
      time: bingoStart,
      sortAt: bingoStart,
      status: bingoStart && new Date(bingoStart).getTime() <= now ? "past" : "upcoming",
    },
  ];

  for (const r of rounds) {
    items.push({
      id: `round-${r.id}`,
      label: r.id === currentRoundId ? `Round ${r.roundNumber} (current)` : `Round ${r.roundNumber}: ${r.name}`,
      time: r.scheduledAt ?? r.actualStartAt,
      sortAt: r.scheduledAt ?? r.actualStartAt ?? r.actualEndAt,
      status:
        r.id === currentRoundId
          ? "current"
          : r.status === "completed"
            ? "past"
            : ["in_progress", "paused"].includes(r.status)
              ? "current"
              : "upcoming",
    });
  }

  items.push({
    id: "event-close",
    label: "Event close",
    time: endsAt.toISOString(),
    sortAt: endsAt.toISOString(),
    status: endsAt.getTime() <= now ? "past" : "upcoming",
  });

  return items.filter((i) => i.sortAt).sort((a, b) => new Date(a.sortAt!).getTime() - new Date(b.sortAt!).getTime());
}

export async function runLiveEventAction(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  permissions: LiveEventPermissions;
  action: string;
  body: Record<string, unknown>;
}): Promise<{ ok: boolean; message?: string; data?: Record<string, unknown> }> {
  const { action, body, permissions } = params;

  if (action === "walk_in") {
    if (!permissions.manageBookings) return { ok: false, message: "Not permitted to add walk-ins." };
    const input = body as unknown as WalkInInput;
    try {
      const result = await createWalkInRegistration({
        organizationId: params.organizationId,
        eventId: params.eventId,
        actorUserId: params.actorUserId,
        input,
      });
      return { ok: true, data: result as unknown as Record<string, unknown> };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Walk-in failed." };
    }
  }

  if (action === "sell_bonus_cards") {
    if (!permissions.managePayments) return { ok: false, message: "Not permitted to record sales." };
    const registrationId = body.registrationId ? BigInt(String(body.registrationId)) : null;
    if (!registrationId) return { ok: false, message: "Attendee required." };
    try {
      const result = await sellBonusCards({
        organizationId: params.organizationId,
        eventId: params.eventId,
        actorUserId: params.actorUserId,
        registrationId,
        quantity: Number(body.quantity) || 1,
        unitPrice: Number(body.unitPrice) || 0,
        paymentMethod: String(body.paymentMethod ?? "cash"),
        discountAmount: body.discountAmount != null ? Number(body.discountAmount) : undefined,
      });
      return { ok: true, data: result as unknown as Record<string, unknown> };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Sale failed." };
    }
  }

  if (action === "undo_check_in") {
    if (!permissions.undoCheckIn) return { ok: false, message: "Not permitted to undo check-in." };
    try {
      await undoCheckIn({
        organizationId: params.organizationId,
        eventId: params.eventId,
        registrationId: BigInt(String(body.registrationId)),
        actorUserId: params.actorUserId,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Undo failed." };
    }
  }

  if (action === "add_incident") {
    if (!permissions.addIncidents) return { ok: false, message: "Not permitted to add incidents." };
    const input = body as unknown as LiveIncidentInput;
    if (!input.description?.trim()) return { ok: false, message: "Description required." };
    const row = await prisma.eventLiveIncident.create({
      data: {
        organizationId: params.organizationId,
        eventId: params.eventId,
        category: input.category?.trim() || "General",
        description: input.description.trim(),
        severity: input.severity?.trim() || "info",
        registrationId: input.registrationId ? BigInt(input.registrationId) : null,
        reportedById: params.actorUserId,
      },
    });
    await writeEventAuditLog({
      organizationId: params.organizationId,
      eventId: params.eventId,
      actorUserId: params.actorUserId,
      action: "live.incident",
      entityType: "live_incident",
      entityId: row.id.toString(),
      metadata: { category: input.category, severity: input.severity },
    });
    return { ok: true, data: { incidentId: row.id.toString() } };
  }

  if (action === "send_announcement") {
    if (!permissions.sendAnnouncements) return { ok: false, message: "Not permitted to send announcements." };
    const input = body as unknown as LiveAnnouncementInput;
    if (!input.message?.trim()) return { ok: false, message: "Message required." };
    if (!input.confirmed) return { ok: false, message: "Confirmation required before sending." };

    await writeEventAuditLog({
      organizationId: params.organizationId,
      eventId: params.eventId,
      actorUserId: params.actorUserId,
      action: "message.sent",
      entityType: "event",
      entityId: params.eventId.toString(),
      metadata: {
        audience: input.audience,
        messagePreview: input.message.trim().slice(0, 200),
        recipientCount: input.registrationIds?.length ?? null,
        channel: "live_mode_queued",
      },
    });
    return {
      ok: true,
      message: "Announcement logged. Connect email/SMS/WhatsApp channels to deliver externally.",
      data: { queued: true },
    };
  }

  return { ok: false, message: "Unknown action." };
}
