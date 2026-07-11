import "server-only";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { markEventExpensePaid } from "@/lib/event-platform/event-financials/event-financials-service";
import { createEventHostInvitation } from "@/lib/event-platform/hosts/host-invite-service";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import { listEventVenues } from "@/lib/event-platform/venues/venue-service";
import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import { prisma } from "@/lib/prisma";

import {
  aggregateHostMetrics,
  aggregateVenueMetrics,
  applyChartFilter,
  buildEventPerformanceSnapshots,
} from "@/lib/event-platform/event-venue-host/event-venue-host-metrics";
import {
  eventMatchesHost,
  eventMatchesVenue,
  resolveCatalogHost,
  resolveCatalogVenue,
  serializeVenueRow,
} from "@/lib/event-platform/event-venue-host/event-venue-host-matching";
import type {
  HostHistoryRow,
  HostPerformanceNoteDto,
  VenueHostChartFilter,
  VenueHostOverview,
  VenueHostRatingInfo,
  VenueHistoryRow,
} from "@/lib/event-platform/event-venue-host/event-venue-host-types";

const RATING_UNAVAILABLE: VenueHostRatingInfo = {
  availability: "not_available",
  label: "Not Available",
  value: null,
};

function ratingField(): VenueHostRatingInfo {
  return { ...RATING_UNAVAILABLE };
}

function formatAddress(parts: {
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null {
  const line1 = [parts.address, parts.address2].filter(Boolean).join(", ");
  const line2 = [parts.city, parts.state, parts.zip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(" · ") || null;
}

function arrivalStatusLabel(snapshot: {
  actualHostArrival: string | null;
  scheduledHostArrival: string | null;
  arrivalOnTime: boolean | null;
}): string | null {
  if (!snapshot.actualHostArrival) return snapshot.scheduledHostArrival ? "Not recorded" : null;
  if (snapshot.arrivalOnTime === true) return "On time";
  if (snapshot.arrivalOnTime === false) return "Late";
  return "Arrived";
}

export async function getVenueHostOverview(
  organizationId: bigint,
  eventIdRaw: string,
  options?: { canManage?: boolean; chartFilter?: VenueHostChartFilter },
): Promise<VenueHostOverview | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: {
      id: true,
      title: true,
      currency: true,
      venueName: true,
      venueAddress: true,
      venueCity: true,
      venueState: true,
      venuePostalCode: true,
      venueCountry: true,
      venueType: true,
      capacity: true,
      foodAndDrinks: true,
      instructorName: true,
      detailContent: true,
    },
  });
  if (!event) return null;

  const detail = parseDetailContent(event.detailContent);
  const ops = detail?.venueHostOps ?? {};

  const [venues, hosts, venueExpense, hostExpense, invitation, allOrgEvents, hostInvitesForOrg] =
    await Promise.all([
      listEventVenues(organizationId),
      prisma.eventHost.findMany({
        where: { organizationId, archivedAt: null },
        select: { id: true, displayName: true, firstName: true, lastName: true, email: true, phone: true, imageUrl: true, bio: true },
      }),
      prisma.eventExpense.findFirst({
        where: { organizationId, eventId, category: "venue" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.eventExpense.findFirst({
        where: { organizationId, eventId, category: "host" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.eventHostInvitation.findFirst({
        where: { organizationId, eventId },
        orderBy: { createdAt: "desc" },
        include: { host: { select: { id: true, displayName: true, email: true, phone: true, imageUrl: true } } },
      }),
      prisma.lmsTrainingEvent.findMany({
        where: { organizationId, eventType: "live_workshop" },
        select: { id: true, venueName: true, instructorName: true, detailContent: true, status: true, startsAt: true },
        orderBy: { startsAt: "desc" },
      }),
      prisma.eventHostInvitation.findMany({
        where: { organizationId },
        select: { hostId: true, eventId: true, status: true },
      }),
    ]);

  const venueCatalog = venues.map(serializeVenueRow);
  const catalogVenue = resolveCatalogVenue(venueCatalog, event);
  const catalogHost =
    (invitation?.host ? hosts.find((h) => h.id === invitation.host!.id) : null) ??
    resolveCatalogHost(hosts, event) ??
    (ops.catalogHostId ? hosts.find((h) => h.id.toString() === ops.catalogHostId) ?? null : null);

  const anchorVenueName = catalogVenue?.name ?? event.venueName;
  const venueEventRows = allOrgEvents.filter((e) =>
    eventMatchesVenue(e, catalogVenue, anchorVenueName),
  );
  const venueEventIds = venueEventRows.map((e) => e.id);

  let hostEventIds: bigint[] = [];
  let hostCancelled = 0;
  if (catalogHost) {
    const inviteEventIds = new Set(
      hostInvitesForOrg.filter((i) => i.hostId === catalogHost.id).map((i) => i.eventId.toString()),
    );
    hostCancelled = allOrgEvents.filter(
      (e) => inviteEventIds.has(e.id.toString()) && e.status === "cancelled",
    ).length;
    hostEventIds = allOrgEvents
      .filter((e) => inviteEventIds.has(e.id.toString()) || eventMatchesHost(e, catalogHost))
      .map((e) => e.id);
  } else {
    hostEventIds = allOrgEvents.filter((e) => eventMatchesHost(e, { displayName: detail?.host?.name ?? event.instructorName ?? "", firstName: null, lastName: null })).map((e) => e.id);
  }

  const snapshotIds = [...new Set([...venueEventIds, ...hostEventIds, eventId])];
  const snapshots = await buildEventPerformanceSnapshots(organizationId, snapshotIds);
  const venueSnapshots = venueEventIds.map((id) => snapshots.get(id.toString())).filter(Boolean) as NonNullable<
    ReturnType<typeof snapshots.get>
  >[];
  const hostSnapshots = hostEventIds.map((id) => snapshots.get(id.toString())).filter(Boolean) as NonNullable<
    ReturnType<typeof snapshots.get>
  >[];

  const chartFilter = options?.chartFilter ?? "last_10";
  const venueChartRows = applyChartFilter(venueSnapshots, chartFilter);
  const hostChartRows = applyChartFilter(hostSnapshots, chartFilter);

  const venueMetricsRaw = aggregateVenueMetrics(venueSnapshots);
  const hostMetricsRaw = aggregateHostMetrics(
    hostSnapshots,
    catalogHost ? hostEventIds.length : hostSnapshots.length,
    hostCancelled,
  );

  let performanceNotes: HostPerformanceNoteDto[] = [];
  if (catalogHost) {
    const notes = await prisma.eventHostPerformanceNote.findMany({
      where: { organizationId, eventId, hostId: catalogHost.id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
      take: 20,
    });
    performanceNotes = notes.map((n) => ({
      id: n.id.toString(),
      note: n.note,
      createdAt: n.createdAt.toISOString(),
      createdByName: n.createdBy?.name ?? null,
    }));
  }

  const eventAddress =
    formatAddress({
      address: event.venueAddress,
      city: event.venueCity,
      state: event.venueState,
      zip: event.venuePostalCode,
    }) ?? null;

  const venueHistory: VenueHistoryRow[] = venueSnapshots
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((s) => ({
      eventId: s.eventId,
      date: s.startsAt.toISOString(),
      eventTitle: s.title,
      status: s.status,
      registered: s.registered,
      checkedIn: s.checkedIn,
      capacityPct: s.capacityPct,
      revenue: s.revenue,
      expenses: s.expenses,
      profit: s.profit,
      margin: s.margin,
      bonusCards: s.bonusCards,
      rating: ratingField(),
    }));

  const hostHistory: HostHistoryRow[] = hostSnapshots
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((s) => ({
      eventId: s.eventId,
      date: s.startsAt.toISOString(),
      eventTitle: s.title,
      venueName: s.venueName,
      status: s.status,
      attendance: s.checkedIn,
      revenue: s.revenue,
      profit: s.profit,
      bonusCards: s.bonusCards,
      rating: ratingField(),
      arrivalStatus: arrivalStatusLabel(s),
      incidents: ratingField(),
    }));

  const hostName = catalogHost?.displayName ?? detail?.host?.name ?? event.instructorName;
  const hostImage = catalogHost?.imageUrl ?? detail?.host?.imageUrl ?? null;

  return {
    currency: event.currency || "USD",
    canManage: options?.canManage ?? false,
    chartFilter,
    ratingSystem: {
      available: false,
      message: "Event rating collection is not yet available. Ratings will appear here in a future release.",
    },
    venue: {
      current: {
        venueId: catalogVenue?.id ?? ops.catalogVenueId ?? null,
        name: catalogVenue?.name ?? event.venueName,
        venueType: catalogVenue?.venueType ?? event.venueType,
        address: catalogVenue
          ? formatAddress({
              address: catalogVenue.address,
              address2: catalogVenue.address2,
              city: catalogVenue.city,
              state: catalogVenue.state,
              zip: catalogVenue.zip,
            })
          : eventAddress,
        contactPerson: catalogVenue
          ? [catalogVenue.contactFirstName, catalogVenue.contactLastName].filter(Boolean).join(" ") || null
          : null,
        phone: catalogVenue?.contactPhone ?? catalogVenue?.phone ?? detail?.venuePhone ?? null,
        email: catalogVenue?.contactEmail ?? null,
        capacity: catalogVenue?.seating ?? event.capacity,
        venueFee: ops.venueFee ?? (venueExpense ? Number(venueExpense.total) : null),
        contractStatus: ops.contractStatus ?? null,
        paymentStatus: ops.venuePaymentStatus ?? venueExpense?.paymentStatus ?? null,
        foodAndDrink:
          event.foodAndDrinks ??
          (() => {
            const text = [
              catalogVenue?.food ? "Food" : null,
              catalogVenue?.drinksAlcohol ? "Drinks (alcohol)" : null,
              detail?.venueAmenities?.food ? "Food service" : null,
              detail?.venueAmenities?.drinksAlcohol ? "Drinks" : null,
            ]
              .filter(Boolean)
              .join(", ");
            return text || null;
          })(),
        parking: ops.parking ?? null,
        accessibility: ops.accessibility ?? null,
        setupInstructions: ops.setupInstructions ?? null,
        businessHours: catalogVenue?.businessHours ?? null,
        notes: ops.venueNotes ?? null,
        profileUrl: catalogVenue ? `${EVENT_PLATFORM_PATHS.venues}?q=${encodeURIComponent(catalogVenue.name)}` : EVENT_PLATFORM_PATHS.venues,
      },
      metrics: {
        ...venueMetricsRaw,
        averageEventRating: ratingField(),
      },
      history: venueHistory,
      charts: venueChartRows.map((s) => ({
        eventId: s.eventId,
        label: s.title.length > 24 ? `${s.title.slice(0, 24)}…` : s.title,
        attendance: s.checkedIn,
        revenue: s.revenue,
        profit: s.profit,
        rating: null,
      })),
    },
    host: {
      current: {
        hostId: catalogHost?.id.toString() ?? ops.catalogHostId ?? null,
        photoUrl: hostImage,
        name: hostName,
        phone: catalogHost?.phone ?? null,
        email: catalogHost?.email ?? null,
        invitationStatus: invitation?.status ?? (hostName ? "assigned" : null),
        confirmationStatus:
          invitation?.status === "accepted" ? "confirmed" : invitation?.status === "pending" ? "pending" : hostName ? "assigned" : null,
        scheduledArrival: ops.scheduledHostArrival ?? null,
        actualArrival: ops.actualHostArrival ?? null,
        paymentType: ops.hostPaymentType ?? hostExpense?.payeeType ?? null,
        paymentAmount: ops.hostPaymentAmount ?? (hostExpense ? Number(hostExpense.total) : null),
        paymentStatus: ops.hostPaymentStatus ?? hostExpense?.paymentStatus ?? null,
        agreementUrl: ops.agreementUrl ?? null,
        notes: ops.hostNotes ?? null,
        profileUrl: catalogHost ? `${EVENT_PLATFORM_PATHS.hosts}?q=${encodeURIComponent(catalogHost.displayName)}` : EVENT_PLATFORM_PATHS.hosts,
        invitationId: invitation?.id.toString() ?? null,
      },
      metrics: {
        totalAssignedEvents: hostMetricsRaw.totalAssignedEvents,
        completedEvents: hostMetricsRaw.completedEvents,
        cancelledEvents: hostMetricsRaw.cancelledEvents,
        averageAttendance: hostMetricsRaw.averageAttendance,
        averageCheckInRate: hostMetricsRaw.averageCheckInRate,
        averageRevenue: hostMetricsRaw.averageRevenue,
        totalRevenueGenerated: hostMetricsRaw.totalRevenueGenerated,
        averageProfit: hostMetricsRaw.averageProfit,
        averageBonusCardSales: hostMetricsRaw.averageBonusCardSales,
        averageEventRating: ratingField(),
        returningAttendeePercentage: hostMetricsRaw.returningAttendeePercentage,
        onTimeArrivalPercentage: hostMetricsRaw.onTimeSampleSize > 0 ? "available" : "not_available",
        onTimeArrivalRate: hostMetricsRaw.onTimeArrivalRate,
        totalGamesHosted: hostMetricsRaw.totalGamesHosted,
        incidentCount: "not_available",
        incidents: null,
      },
      history: hostHistory,
      charts: hostChartRows.map((s) => ({
        eventId: s.eventId,
        label: s.title.length > 24 ? `${s.title.slice(0, 24)}…` : s.title,
        attendance: s.checkedIn,
        revenue: s.revenue,
        profit: s.profit,
        rating: null,
      })),
      performanceNotes,
    },
  };
}

export async function updateVenueHostOps(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  patch: Record<string, unknown>;
}): Promise<boolean> {
  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: params.eventId, organizationId: params.organizationId },
    select: { id: true, detailContent: true },
  });
  if (!event) return false;

  const existing = parseDetailContent(event.detailContent) ?? {};
  const ops = { ...(existing.venueHostOps ?? {}), ...params.patch };

  await prisma.lmsTrainingEvent.update({
    where: { id: event.id },
    data: {
      detailContent: { ...existing, venueHostOps: ops },
      updatedAt: new Date(),
    },
  });

  await writeEventAuditLog({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "venue_host.ops_updated",
    entityType: "event",
    entityId: event.id.toString(),
    metadata: { fields: Object.keys(params.patch) },
  });

  return true;
}

export async function addHostPerformanceNote(params: {
  organizationId: bigint;
  eventId: bigint;
  hostId: bigint;
  actorUserId: bigint;
  note: string;
}): Promise<HostPerformanceNoteDto | null> {
  const trimmed = params.note.trim();
  if (!trimmed) return null;

  const host = await prisma.eventHost.findFirst({
    where: { id: params.hostId, organizationId: params.organizationId },
  });
  if (!host) return null;

  const row = await prisma.eventHostPerformanceNote.create({
    data: {
      organizationId: params.organizationId,
      eventId: params.eventId,
      hostId: params.hostId,
      note: trimmed,
      createdById: params.actorUserId,
    },
    include: { createdBy: { select: { name: true } } },
  });

  await writeEventAuditLog({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "host.performance_note_added",
    entityType: "event_host",
    entityId: host.id.toString(),
    metadata: { eventId: params.eventId.toString(), noteId: row.id.toString() },
  });

  return {
    id: row.id.toString(),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    createdByName: row.createdBy?.name ?? null,
  };
}

export async function runVenueHostAction(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  action: string;
  body: Record<string, unknown>;
}): Promise<{ ok: boolean; message?: string; data?: unknown }> {
  const { action, body } = params;

  if (action === "update_ops") {
    const patch = (body.patch as Record<string, unknown>) ?? body;
    const ok = await updateVenueHostOps({
      organizationId: params.organizationId,
      eventId: params.eventId,
      actorUserId: params.actorUserId,
      patch,
    });
    return { ok, message: ok ? undefined : "Event not found." };
  }

  if (action === "confirm_host_arrival") {
    const ok = await updateVenueHostOps({
      organizationId: params.organizationId,
      eventId: params.eventId,
      actorUserId: params.actorUserId,
      patch: { actualHostArrival: new Date().toISOString() },
    });
    return { ok };
  }

  if (action === "mark_venue_fee_paid") {
    const expense = await prisma.eventExpense.findFirst({
      where: { organizationId: params.organizationId, eventId: params.eventId, category: "venue" },
      orderBy: { createdAt: "desc" },
    });
    if (expense) {
      await markEventExpensePaid({
        organizationId: params.organizationId,
        eventId: params.eventId,
        expenseId: expense.id,
        actorUserId: params.actorUserId,
      });
    } else {
      await updateVenueHostOps({
        organizationId: params.organizationId,
        eventId: params.eventId,
        actorUserId: params.actorUserId,
        patch: { venuePaymentStatus: "paid" },
      });
    }
    return { ok: true };
  }

  if (action === "mark_host_payment_paid") {
    const expense = await prisma.eventExpense.findFirst({
      where: { organizationId: params.organizationId, eventId: params.eventId, category: "host" },
      orderBy: { createdAt: "desc" },
    });
    if (expense) {
      await markEventExpensePaid({
        organizationId: params.organizationId,
        eventId: params.eventId,
        expenseId: expense.id,
        actorUserId: params.actorUserId,
      });
    } else {
      await updateVenueHostOps({
        organizationId: params.organizationId,
        eventId: params.eventId,
        actorUserId: params.actorUserId,
        patch: { hostPaymentStatus: "paid" },
      });
    }
    return { ok: true };
  }

  if (action === "add_performance_note") {
    const hostIdRaw = body.hostId;
    const note = typeof body.note === "string" ? body.note : "";
    if (!hostIdRaw) return { ok: false, message: "Host is required." };
    let hostId: bigint;
    try {
      hostId = BigInt(String(hostIdRaw));
    } catch {
      return { ok: false, message: "Invalid host." };
    }
    const created = await addHostPerformanceNote({
      organizationId: params.organizationId,
      eventId: params.eventId,
      hostId,
      actorUserId: params.actorUserId,
      note,
    });
    if (!created) return { ok: false, message: "Could not save note." };
    return { ok: true, data: created };
  }

  if (action === "resend_invitation") {
    const hostIdRaw = body.hostId;
    if (!hostIdRaw) return { ok: false, message: "Host is required." };
    let hostId: bigint;
    try {
      hostId = BigInt(String(hostIdRaw));
    } catch {
      return { ok: false, message: "Invalid host." };
    }
    try {
      const result = await createEventHostInvitation({
        organizationId: params.organizationId,
        hostId,
        invitedById: params.actorUserId,
        input: { eventId: params.eventId.toString(), message: typeof body.message === "string" ? body.message : undefined },
      });
      return { ok: true, data: result.invitation };
    } catch (e: unknown) {
      return { ok: false, message: e instanceof Error ? e.message : "Could not resend invitation." };
    }
  }

  return { ok: false, message: "Unknown action." };
}

export function venueHostHistoryCsv(overview: VenueHostOverview, section: "venue" | "host"): string {
  if (section === "venue") {
    const headers = [
      "Date",
      "Event",
      "Status",
      "Registered",
      "Checked In",
      "Capacity %",
      "Revenue",
      "Expenses",
      "Profit",
      "Margin %",
      "Bonus Cards",
      "Rating",
    ];
    const rows = overview.venue.history.map((r) =>
      [
        r.date,
        r.eventTitle,
        r.status,
        r.registered,
        r.checkedIn,
        r.capacityPct ?? "",
        r.revenue,
        r.expenses,
        r.profit,
        r.margin ?? "",
        r.bonusCards,
        r.rating.label,
      ].join(","),
    );
    return [headers.join(","), ...rows].join("\n");
  }

  const headers = [
    "Date",
    "Event",
    "Venue",
    "Status",
    "Attendance",
    "Revenue",
    "Profit",
    "Bonus Cards",
    "Rating",
    "Arrival Status",
    "Incidents",
  ];
  const rows = overview.host.history.map((r) =>
    [
      r.date,
      r.eventTitle,
      r.venueName ?? "",
      r.status,
      r.attendance,
      r.revenue,
      r.profit,
      r.bonusCards,
      r.rating.label,
      r.arrivalStatus ?? "",
      r.incidents.label,
    ].join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
