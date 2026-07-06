import { NextRequest, NextResponse } from "next/server";

import { canAccessLmsEventAdminFromRequest } from "@/lib/lms-events/admin-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OrderMeta = {
  reference?: string;
  mode?: string;
  customer?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  items?: Array<{ id?: string; type?: string; title?: string; quantity?: number }>;
  workshopTickets?: Array<{ registrationId?: string; eventId?: string; qrToken?: string; bookingStatus?: string }>;
};

function sessionStatus(event: {
  status: string;
  startsAt: Date;
  endsAt: Date;
}): "upcoming" | "completed" | "sold_out" | "cancelled" {
  const now = Date.now();
  if (event.status === "sold_out") return "sold_out";
  if (event.status === "cancelled") return "cancelled";
  if (event.endsAt.getTime() < now) return "completed";
  if (event.startsAt.getTime() > now) return "upcoming";
  return "upcoming";
}

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!(await canAccessLmsEventAdminFromRequest(req))) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const orgId = actor.organizationId;
  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [events, registrations, orders, categories] = await Promise.all([
    prisma.lmsTrainingEvent.findMany({
      where: {
        organizationId: orgId,
        slug: { startsWith: "cs-workshop-" },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        startsAt: true,
        endsAt: true,
        venueCity: true,
        venueState: true,
        venueName: true,
        capacity: true,
        registeredCount: true,
        status: true,
        instructorName: true,
        imageUrl: true,
        categoryId: true,
        priceFrom: true,
      },
    }),
    prisma.lmsEventRegistration.findMany({
      where: {
        organizationId: orgId,
        event: { slug: { startsWith: "cs-workshop-" } },
      },
      select: {
        id: true,
        eventId: true,
        attendeeName: true,
        attendeeEmail: true,
        bookingStatus: true,
        paymentStatus: true,
        checkedInAt: true,
        qrToken: true,
        registeredAt: true,
      },
      orderBy: { registeredAt: "desc" },
      take: 500,
    }),
    prisma.order.findMany({
      where: {
        createdBy: orgId,
        paymentType: { in: ["company_site_reserve", "company_site_checkout"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        orderId: true,
        name: true,
        email: true,
        amount: true,
        status: true,
        paymentStatus: true,
        paymentType: true,
        createdAt: true,
        metadata: true,
      },
    }),
    prisma.lmsEventCategory.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    }),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id.toString(), c.name]));

  const eventStats = events.map((event) => {
    const eventRegs = registrations.filter((r) => r.eventId === event.id);
    const checkedIn = eventRegs.filter((r) => r.checkedInAt).length;
    const capacity = event.capacity ?? 0;
    const registered = event.registeredCount;
    const fillPct = capacity > 0 ? Math.round((registered / capacity) * 100) : 0;
    const checkInPct = eventRegs.length > 0 ? Math.round((checkedIn / eventRegs.length) * 100) : 0;

    return {
      id: event.id.toString(),
      slug: event.slug,
      catalogSlug: event.slug.replace("cs-workshop-", ""),
      title: event.title,
      instructorName: event.instructorName ?? "Workshop lead",
      categoryName: event.categoryId ? categoryById.get(event.categoryId.toString()) ?? "Workshop" : "Workshop",
      imageUrl: event.imageUrl,
      price: event.priceFrom != null ? Number(event.priceFrom) : null,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      location: [event.venueCity, event.venueState].filter(Boolean).join(", ") || event.venueName || "—",
      capacity,
      registeredCount: registered,
      checkedInCount: checkedIn,
      attendanceRate: checkInPct,
      fillRate: fillPct,
      sessionStatus: sessionStatus(event),
      status: event.status,
      adminUrl: `/admin/event-platform/events/${event.id}`,
      attendeesUrl: `/admin/event-platform/events/${event.id}/attendees`,
      checkInUrl: `/admin/event-platform/events/${event.id}/check-in`,
    };
  });

  const reservationRows = orders
    .map((order) => {
      let meta: OrderMeta | null = null;
      try {
        meta = order.metadata ? (JSON.parse(order.metadata) as OrderMeta) : null;
      } catch {
        meta = null;
      }
      const workshopItems = (meta?.items ?? []).filter(
        (item) => item.type === "workshop" || item.id?.startsWith("workshop:"),
      );
      if (workshopItems.length === 0 && !(meta?.workshopTickets?.length)) return null;
      return {
        reference: order.orderId,
        name: order.name,
        email: order.email,
        amount: Number(order.amount),
        status: order.status,
        paymentStatus: order.paymentStatus,
        mode: meta?.mode ?? (order.paymentType === "company_site_reserve" ? "reserve" : "checkout"),
        createdAt: order.createdAt.toISOString(),
        workshops: workshopItems.map((item) => item.title ?? item.id ?? "Workshop"),
        ticketCount: meta?.workshopTickets?.length ?? 0,
      };
    })
    .filter(Boolean);

  const totalCheckedIn = registrations.filter((r) => r.checkedInAt).length;
  const totalCapacity = eventStats.reduce((s, e) => s + (e.capacity || 0), 0);
  const totalRegistered = eventStats.reduce((s, e) => s + e.registeredCount, 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0;
  const upcoming30Count = eventStats.filter((e) => {
    const start = new Date(e.startsAt);
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    return start >= now && start <= in30 && e.sessionStatus !== "completed";
  }).length;
  const completedThisMonth = eventStats.filter((e) => {
    const end = new Date(e.endsAt);
    return end >= monthStart && end <= monthEnd && e.sessionStatus === "completed";
  }).length;

  const upcomingIn7Days = eventStats
    .filter((e) => {
      const start = new Date(e.startsAt);
      return start >= now && start <= in7Days;
    })
    .slice(0, 5);

  const mostRegistered = [...eventStats].sort((a, b) => b.registeredCount - a.registeredCount)[0] ?? null;
  const highestAttendance = [...eventStats]
    .filter((e) => e.registeredCount > 0)
    .sort((a, b) => b.attendanceRate - a.attendanceRate)[0] ?? null;
  const lowRegistration = [...eventStats]
    .filter((e) => e.capacity > 0)
    .sort((a, b) => a.fillRate - b.fillRate)[0] ?? null;

  return NextResponse.json({
    ok: true,
    summary: {
      workshopCount: events.length,
      reservationCount: reservationRows.length,
      registrationCount: registrations.length,
      checkedInCount: totalCheckedIn,
      attendanceRate: registrations.length > 0 ? Math.round((totalCheckedIn / registrations.length) * 100) : 0,
      totalCapacity,
      totalRegistered,
      fillRate,
      upcomingCount: upcoming30Count,
      upcomingIn7Days: upcomingIn7Days.length,
      completedThisMonth,
    },
    insights: {
      upcomingIn7Days,
      mostRegistered,
      highestAttendance,
      lowRegistration,
    },
    workshops: eventStats,
    reservations: reservationRows,
    registrations: registrations.map((r) => {
      const event = events.find((e) => e.id === r.eventId);
      return {
        id: r.id.toString(),
        eventId: r.eventId.toString(),
        eventTitle: event?.title ?? "Workshop",
        attendeeName: r.attendeeName,
        attendeeEmail: r.attendeeEmail,
        bookingStatus: r.bookingStatus,
        paymentStatus: r.paymentStatus,
        checkedInAt: r.checkedInAt?.toISOString() ?? null,
        qrToken: r.qrToken,
        registeredAt: r.registeredAt.toISOString(),
        checkInUrl: `/admin/event-platform/events/${r.eventId}/check-in`,
      };
    }),
  });
}
