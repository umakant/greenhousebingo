import type { Prisma } from "@prisma/client";

import type { LmsEventCreateWizardInput, LmsEventListFiltersInput } from "@/lib/lms-events/schemas";
import type {
  LmsEvent,
  LmsEventAttendee,
  LmsEventCategory,
  LmsEventCertificate,
  LmsEventIncomeReport,
  LmsEventNotification,
  LmsEventOrganizerKpis,
  LmsEventRegistration,
  LmsEventSupportTicket,
  LmsEventTicket,
  LmsEventTransaction,
  LmsEventWishlistItem,
} from "@/lib/lms-events/types";
import { prisma } from "@/lib/prisma";

export type LmsEventRepositoryScope = {
  organizationId: string;
  studentUserId?: string;
};

type DbEvent = Prisma.LmsTrainingEventGetPayload<{ include: { category: true } }>;

function idStr(v: bigint | number | null | undefined): string {
  return v == null ? "" : v.toString();
}

function iso(d: Date | null | undefined): string {
  return d ? d.toISOString() : new Date(0).toISOString();
}

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

function auditFrom(row: {
  id: bigint;
  organizationId: bigint;
  createdAt: Date;
  updatedAt: Date | null;
  createdById: bigint | null;
  updatedById: bigint | null;
}) {
  return {
    id: idStr(row.id),
    organizationId: idStr(row.organizationId),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt ?? row.createdAt),
    createdById: row.createdById ? idStr(row.createdById) : null,
    updatedById: row.updatedById ? idStr(row.updatedById) : null,
  };
}

export function mapDbCategory(row: Prisma.LmsEventCategoryGetPayload<object>): LmsEventCategory {
  return {
    ...auditFrom(row),
    status: row.status as LmsEventCategory["status"],
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sortOrder,
  };
}

export function mapDbEvent(row: DbEvent): LmsEvent {
  const capacity = row.capacity;
  const registeredCount = row.registeredCount;
  const seatsRemaining = capacity != null ? Math.max(0, capacity - registeredCount) : null;
  return {
    ...auditFrom(row),
    status: row.status as LmsEvent["status"],
    title: row.title,
    slug: row.slug,
    description: row.description,
    shortDescription: row.shortDescription,
    imageUrl: row.imageUrl,
    categoryId: row.categoryId ? idStr(row.categoryId) : null,
    categoryName: row.category?.name ?? null,
    eventType: row.eventType as LmsEvent["eventType"],
    deliveryMode: row.deliveryMode as LmsEvent["deliveryMode"],
    instructorName: row.instructorName,
    instructorUserId: row.instructorUserId ? idStr(row.instructorUserId) : null,
    startsAt: iso(row.startsAt),
    endsAt: iso(row.endsAt),
    timezone: row.timezone,
    venueName: row.venueName,
    venueAddress: row.venueAddress,
    venueCity: row.venueCity,
    venueState: row.venueState,
    venuePostalCode: row.venuePostalCode,
    venueCountry: row.venueCountry,
    venueLat: row.venueLat,
    venueLng: row.venueLng,
    onlineMeetingUrl: row.onlineMeetingUrl,
    capacity,
    registeredCount,
    seatsRemaining,
    isPublic: row.isPublic,
    isFree: row.isFree,
    priceFrom: row.priceFrom != null ? num(row.priceFrom) : null,
    currency: row.currency,
    certificationAvailable: row.certificationAvailable,
    certificationName: row.certificationName,
    requirements: row.requirements,
    cancellationPolicy: row.cancellationPolicy,
    isFeatured: row.isFeatured,
    ageRule: row.ageRule,
    doorsOpen: row.doorsOpen,
    bingoStart: row.bingoStart,
    venueType: row.venueType,
    cardsIncluded: row.cardsIncluded,
    extraCardPrice: row.extraCardPrice != null ? num(row.extraCardPrice) : null,
    foodAndDrinks: row.foodAndDrinks,
    attire: row.attire,
    linkedCourseId: row.linkedCourseId ? idStr(row.linkedCourseId) : null,
    linkedLiveSessionId: row.linkedLiveSessionId ? idStr(row.linkedLiveSessionId) : null,
    revenueTotal: num(row.revenueTotal),
  };
}

function mapDbTicket(row: Prisma.LmsEventTicketGetPayload<object>): LmsEventTicket {
  return {
    ...auditFrom(row),
    eventId: idStr(row.eventId),
    name: row.name,
    description: row.description,
    price: num(row.price),
    currency: row.currency,
    quantity: row.quantity,
    soldCount: row.soldCount,
    saleStartsAt: row.saleStartsAt ? iso(row.saleStartsAt) : null,
    saleEndsAt: row.saleEndsAt ? iso(row.saleEndsAt) : null,
    ticketStatus: row.ticketStatus as LmsEventTicket["ticketStatus"],
    isFree: row.isFree,
    accessRules: row.accessRules,
  };
}

function mapDbRegistration(row: Prisma.LmsEventRegistrationGetPayload<object>): LmsEventRegistration {
  return {
    ...auditFrom(row),
    eventId: idStr(row.eventId),
    ticketId: row.ticketId ? idStr(row.ticketId) : "",
    studentUserId: idStr(row.studentUserId),
    bookingStatus: row.bookingStatus as LmsEventRegistration["bookingStatus"],
    attendeeName: row.attendeeName,
    attendeeEmail: row.attendeeEmail,
    paymentStatus: row.paymentStatus as LmsEventRegistration["paymentStatus"],
    amountPaid: num(row.amountPaid),
    currency: row.currency,
    registeredAt: iso(row.registeredAt),
    checkedInAt: row.checkedInAt ? iso(row.checkedInAt) : null,
    qrToken: row.qrToken,
  };
}

function learnerVisible(event: LmsEvent): boolean {
  return event.isPublic && !["draft", "archived", "cancelled"].includes(event.status);
}

function buildEventWhere(
  organizationId: bigint,
  filters: LmsEventListFiltersInput,
  admin: boolean,
): Prisma.LmsTrainingEventWhereInput {
  const where: Prisma.LmsTrainingEventWhereInput = { organizationId };
  if (!admin) {
    where.isPublic = true;
    where.status = { notIn: ["draft", "archived", "cancelled"] };
  }
  if (filters.search) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { shortDescription: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (filters.categoryId) where.categoryId = BigInt(filters.categoryId);
  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.deliveryMode) where.deliveryMode = filters.deliveryMode;
  if (filters.freeOnly) where.isFree = true;
  if (filters.paidOnly) where.isFree = false;
  if (filters.certificationOnly) where.certificationAvailable = true;
  if (filters.dateFrom) where.startsAt = { ...(where.startsAt as object), gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.startsAt = { ...(where.startsAt as object), lte: new Date(filters.dateTo) };
  if (filters.location) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { venueCity: { contains: filters.location, mode: "insensitive" } },
          { venueName: { contains: filters.location, mode: "insensitive" } },
          { venueState: { contains: filters.location, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    where.status = { in: statuses };
  }
  return where;
}

let dbReady: boolean | null = null;

export async function lmsEventsDbReady(): Promise<boolean> {
  if (dbReady != null) return dbReady;
  try {
    const client = prisma as unknown as {
      lmsTrainingEvent?: { findMany: unknown };
      lmsEventCategory?: { findMany: unknown };
    };
    if (
      typeof client.lmsTrainingEvent?.findMany !== "function" ||
      typeof client.lmsEventCategory?.findMany !== "function"
    ) {
      dbReady = false;
      return false;
    }
    await prisma.$queryRaw`SELECT 1 FROM lms_events LIMIT 1`;
    dbReady = true;
  } catch {
    dbReady = false;
  }
  return dbReady;
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export class LmsEventDbRepository {
  constructor(private readonly scope: LmsEventRepositoryScope) {}

  private orgId(): bigint {
    return BigInt(this.scope.organizationId);
  }

  async listCategories(): Promise<LmsEventCategory[]> {
    const rows = await prisma.lmsEventCategory.findMany({
      where: { organizationId: this.orgId() },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(mapDbCategory);
  }

  async listEvents(filters: LmsEventListFiltersInput = {}): Promise<LmsEvent[]> {
    const rows = await prisma.lmsTrainingEvent.findMany({
      where: buildEventWhere(this.orgId(), filters, false),
      include: { category: true },
      orderBy: { startsAt: "asc" },
    });
    return rows.map(mapDbEvent).filter(learnerVisible);
  }

  async listAdminEvents(filters: LmsEventListFiltersInput = {}): Promise<LmsEvent[]> {
    const rows = await prisma.lmsTrainingEvent.findMany({
      where: buildEventWhere(this.orgId(), filters, true),
      include: { category: true },
      orderBy: { startsAt: "desc" },
    });
    return rows.map(mapDbEvent);
  }

  async createAdminEvent(
    input: LmsEventCreateWizardInput,
    actorUserId?: string,
  ): Promise<{ event: LmsEvent; ticket: LmsEventTicket }> {
    const orgId = this.orgId();
    const actorId = actorUserId ? BigInt(actorUserId) : orgId;
    const slugBase = input.slug?.trim() || slugifyTitle(input.title);
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new Error("Invalid schedule dates.");
    }
    if (endsAt <= startsAt) throw new Error("End time must be after start time.");

    const isFree = input.isFree || input.price <= 0;
    const priceFrom = isFree ? 0 : input.price;
    const publishStatus = input.status === "draft" ? "draft" : input.status || "registration_open";

    const result = await prisma.$transaction(async (tx) => {
      const eventRow = await tx.lmsTrainingEvent.create({
        data: {
          organizationId: orgId,
          slug,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          shortDescription: input.shortDescription?.trim() || null,
          imageUrl: input.imageUrl?.trim() || null,
          categoryId: BigInt(input.categoryId),
          eventType: input.eventType,
          deliveryMode: input.deliveryMode,
          status: publishStatus,
          instructorName: input.instructorName?.trim() || null,
          startsAt,
          endsAt,
          timezone: input.timezone || "America/New_York",
          venueName: input.deliveryMode === "online" ? null : input.venueName?.trim() || null,
          venueAddress: input.deliveryMode === "online" ? null : input.venueAddress?.trim() || null,
          venueCity: input.deliveryMode === "online" ? null : input.venueCity?.trim() || null,
          venueState: input.deliveryMode === "online" ? null : input.venueState?.trim() || null,
          venuePostalCode: input.deliveryMode === "online" ? null : input.venuePostalCode?.trim() || null,
          venueCountry: input.deliveryMode === "online" ? null : input.venueCountry?.trim() || null,
          venueLat: input.deliveryMode === "online" ? null : input.venueLat ?? null,
          venueLng: input.deliveryMode === "online" ? null : input.venueLng ?? null,
          onlineMeetingUrl:
            input.deliveryMode === "in_person" ? null : input.onlineMeetingUrl?.trim() || null,
          capacity: input.capacity ?? input.quantity ?? null,
          registeredCount: 0,
          isPublic: input.isPublic,
          isFree,
          priceFrom,
          currency: input.currency || "USD",
          certificationAvailable: input.certificationAvailable,
          certificationName: input.certificationName?.trim() || null,
          requirements: input.requirements?.trim() || null,
          cancellationPolicy: input.cancellationPolicy?.trim() || null,
          isFeatured: input.isFeatured ?? false,
          ageRule: input.ageRule ?? null,
          doorsOpen: input.doorsOpen?.trim() || null,
          bingoStart: input.bingoStart?.trim() || null,
          venueType: input.venueType ?? null,
          cardsIncluded: input.cardsIncluded ?? null,
          extraCardPrice:
            input.extraCardPrice != null && input.extraCardPrice > 0 ? input.extraCardPrice : null,
          foodAndDrinks: input.foodAndDrinks?.trim() || null,
          attire: input.attire?.trim() || null,
          revenueTotal: 0,
          createdById: actorId,
          updatedById: actorId,
        },
        include: { category: true },
      });

      const ticketRow = await tx.lmsEventTicket.create({
        data: {
          organizationId: orgId,
          eventId: eventRow.id,
          name: input.ticketName.trim(),
          description: input.ticketDescription?.trim() || null,
          price: isFree ? 0 : input.price,
          currency: input.currency || "USD",
          quantity: input.quantity ?? null,
          soldCount: 0,
          saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null,
          saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null,
          ticketStatus: input.ticketStatus || "available",
          isFree,
          createdById: actorId,
          updatedById: actorId,
        },
      });

      if (input.extraCardPrice != null && input.extraCardPrice > 0) {
        await tx.lmsEventTicket.create({
          data: {
            organizationId: orgId,
            eventId: eventRow.id,
            name: "Extra bingo card",
            description: "Additional bingo card for the same event",
            price: input.extraCardPrice,
            currency: input.currency || "USD",
            quantity: null,
            soldCount: 0,
            ticketStatus: "available",
            isFree: false,
            createdById: actorId,
            updatedById: actorId,
          },
        });
      }

      return { eventRow, ticketRow };
    });

    return {
      event: mapDbEvent(result.eventRow),
      ticket: mapDbTicket(result.ticketRow),
    };
  }

  async updateAdminEvent(
    eventId: string,
    input: LmsEventCreateWizardInput,
    actorUserId?: string,
  ): Promise<{ event: LmsEvent; ticket: LmsEventTicket }> {
    const orgId = this.orgId();
    const actorId = actorUserId ? BigInt(actorUserId) : orgId;
    let eventIdBig: bigint;
    try {
      eventIdBig = BigInt(eventId);
    } catch {
      throw new Error("Invalid event id.");
    }

    const existing = await prisma.lmsTrainingEvent.findFirst({
      where: { id: eventIdBig, organizationId: orgId },
      select: { id: true, slug: true },
    });
    if (!existing) throw new Error("Event not found.");

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new Error("Invalid schedule dates.");
    }
    if (endsAt <= startsAt) throw new Error("End time must be after start time.");

    const isFree = input.isFree || input.price <= 0;
    const priceFrom = isFree ? 0 : input.price;
    const publishStatus = input.soldOut
      ? "sold_out"
      : input.status === "draft"
        ? "draft"
        : input.status || "registration_open";

    const result = await prisma.$transaction(async (tx) => {
      const eventRow = await tx.lmsTrainingEvent.update({
        where: { id: eventIdBig },
        data: {
          title: input.title.trim(),
          description: input.description?.trim() || null,
          shortDescription: input.shortDescription?.trim() || null,
          imageUrl: input.imageUrl?.trim() || null,
          categoryId: BigInt(input.categoryId),
          eventType: input.eventType,
          deliveryMode: input.deliveryMode,
          status: publishStatus,
          instructorName: input.instructorName?.trim() || null,
          startsAt,
          endsAt,
          timezone: input.timezone || "America/New_York",
          venueName: input.deliveryMode === "online" ? null : input.venueName?.trim() || null,
          venueAddress: input.deliveryMode === "online" ? null : input.venueAddress?.trim() || null,
          venueCity: input.deliveryMode === "online" ? null : input.venueCity?.trim() || null,
          venueState: input.deliveryMode === "online" ? null : input.venueState?.trim() || null,
          venuePostalCode: input.deliveryMode === "online" ? null : input.venuePostalCode?.trim() || null,
          venueCountry: input.deliveryMode === "online" ? null : input.venueCountry?.trim() || null,
          venueLat: input.deliveryMode === "online" ? null : input.venueLat ?? null,
          venueLng: input.deliveryMode === "online" ? null : input.venueLng ?? null,
          onlineMeetingUrl:
            input.deliveryMode === "in_person" ? null : input.onlineMeetingUrl?.trim() || null,
          capacity: input.capacity ?? input.quantity ?? null,
          isPublic: input.isPublic,
          isFree,
          priceFrom,
          currency: input.currency || "USD",
          certificationAvailable: input.certificationAvailable,
          certificationName: input.certificationName?.trim() || null,
          requirements: input.requirements?.trim() || null,
          cancellationPolicy: input.cancellationPolicy?.trim() || null,
          isFeatured: input.isFeatured ?? false,
          ageRule: input.ageRule ?? null,
          doorsOpen: input.doorsOpen?.trim() || null,
          bingoStart: input.bingoStart?.trim() || null,
          venueType: input.venueType ?? null,
          cardsIncluded: input.cardsIncluded ?? null,
          extraCardPrice:
            input.extraCardPrice != null && input.extraCardPrice > 0 ? input.extraCardPrice : null,
          foodAndDrinks: input.foodAndDrinks?.trim() || null,
          attire: input.attire?.trim() || null,
          updatedById: actorId,
          updatedAt: new Date(),
        },
        include: { category: true },
      });

      const tickets = await tx.lmsEventTicket.findMany({
        where: { organizationId: orgId, eventId: eventIdBig },
        orderBy: { price: "asc" },
      });
      const primaryTicket =
        tickets.find((t) => t.name !== "Extra bingo card") ?? tickets[0] ?? null;

      let ticketRow;
      if (primaryTicket) {
        ticketRow = await tx.lmsEventTicket.update({
          where: { id: primaryTicket.id },
          data: {
            name: input.ticketName.trim(),
            description: input.ticketDescription?.trim() || null,
            price: isFree ? 0 : input.price,
            currency: input.currency || "USD",
            quantity: input.quantity ?? null,
            saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null,
            saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null,
            ticketStatus: input.ticketStatus || "available",
            isFree,
            updatedById: actorId,
            updatedAt: new Date(),
          },
        });
      } else {
        ticketRow = await tx.lmsEventTicket.create({
          data: {
            organizationId: orgId,
            eventId: eventIdBig,
            name: input.ticketName.trim(),
            description: input.ticketDescription?.trim() || null,
            price: isFree ? 0 : input.price,
            currency: input.currency || "USD",
            quantity: input.quantity ?? null,
            soldCount: 0,
            saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null,
            saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null,
            ticketStatus: input.ticketStatus || "available",
            isFree,
            createdById: actorId,
            updatedById: actorId,
          },
        });
      }

      const extraTicket = tickets.find((t) => t.name === "Extra bingo card");
      if (input.extraCardPrice != null && input.extraCardPrice > 0) {
        if (extraTicket) {
          await tx.lmsEventTicket.update({
            where: { id: extraTicket.id },
            data: {
              price: input.extraCardPrice,
              currency: input.currency || "USD",
              updatedById: actorId,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.lmsEventTicket.create({
            data: {
              organizationId: orgId,
              eventId: eventIdBig,
              name: "Extra bingo card",
              description: "Additional bingo card for the same event",
              price: input.extraCardPrice,
              currency: input.currency || "USD",
              quantity: null,
              soldCount: 0,
              ticketStatus: "available",
              isFree: false,
              createdById: actorId,
              updatedById: actorId,
            },
          });
        }
      } else if (extraTicket) {
        await tx.lmsEventTicket.delete({ where: { id: extraTicket.id } });
      }

      return { eventRow, ticketRow };
    });

    return {
      event: mapDbEvent(result.eventRow),
      ticket: mapDbTicket(result.ticketRow),
    };
  }

  async getEventById(id: string): Promise<LmsEvent | null> {
    let eventId: bigint;
    try {
      eventId = BigInt(id);
    } catch {
      return null;
    }
    const row = await prisma.lmsTrainingEvent.findFirst({
      where: { id: eventId, organizationId: this.orgId() },
      include: { category: true },
    });
    return row ? mapDbEvent(row) : null;
  }

  async listTickets(eventId: string): Promise<LmsEventTicket[]> {
    const rows = await prisma.lmsEventTicket.findMany({
      where: { organizationId: this.orgId(), eventId: BigInt(eventId) },
      orderBy: { price: "asc" },
    });
    return rows.map(mapDbTicket);
  }

  async listMyRegistrations(tab?: "upcoming" | "completed" | "cancelled" | "waitlisted"): Promise<LmsEventRegistration[]> {
    const uid = this.scope.studentUserId;
    if (!uid) return [];
    const rows = await prisma.lmsEventRegistration.findMany({
      where: { organizationId: this.orgId(), studentUserId: BigInt(uid) },
      orderBy: { registeredAt: "desc" },
    });
    const mapped = rows.map(mapDbRegistration);
    if (!tab) return mapped;
    const now = Date.now();
    const events = await this.listAdminEvents();
    return mapped.filter((r) => {
      const event = events.find((e) => e.id === r.eventId);
      if (tab === "cancelled") return r.bookingStatus === "cancelled" || r.bookingStatus === "refunded";
      if (tab === "waitlisted") return r.bookingStatus === "waitlisted";
      if (tab === "completed") return r.bookingStatus === "completed" || (event && new Date(event.endsAt).getTime() < now);
      return ["confirmed", "checked_in", "pending"].includes(r.bookingStatus) && event && new Date(event.startsAt).getTime() >= now;
    });
  }

  async getRegistration(eventId: string, studentUserId?: string): Promise<LmsEventRegistration | null> {
    const uid = studentUserId ?? this.scope.studentUserId;
    if (!uid) return null;
    const row = await prisma.lmsEventRegistration.findFirst({
      where: {
        organizationId: this.orgId(),
        eventId: BigInt(eventId),
        studentUserId: BigInt(uid),
      },
    });
    return row ? mapDbRegistration(row) : null;
  }

  async registerForEvent(params: {
    eventId: string;
    ticketId: string;
    attendeeName: string;
    attendeeEmail: string;
  }): Promise<LmsEventRegistration> {
    const uid = this.scope.studentUserId;
    if (!uid) throw new Error("Not signed in");
    const existing = await this.getRegistration(params.eventId, uid);
    if (existing) return existing;

    const event = await this.getEventById(params.eventId);
    if (!event || !learnerVisible(event)) throw new Error("Event not available");

    const ticket = (await this.listTickets(params.eventId)).find((t) => t.id === params.ticketId);
    if (!ticket || ticket.ticketStatus === "sold_out" || ticket.ticketStatus === "closed") {
      throw new Error("Ticket not available");
    }

    const row = await prisma.$transaction(async (tx) => {
      const reg = await tx.lmsEventRegistration.create({
        data: {
          organizationId: this.orgId(),
          eventId: BigInt(params.eventId),
          ticketId: BigInt(params.ticketId),
          studentUserId: BigInt(uid),
          bookingStatus: ticket.isFree ? "confirmed" : "pending",
          attendeeName: params.attendeeName,
          attendeeEmail: params.attendeeEmail,
          paymentStatus: ticket.isFree ? "comped" : "unpaid",
          amountPaid: ticket.isFree ? 0 : ticket.price,
          currency: ticket.currency,
          qrToken: `QR-${params.eventId.toUpperCase()}-${Date.now()}`,
          createdById: BigInt(uid),
          updatedById: BigInt(uid),
        },
      });
      await tx.lmsTrainingEvent.update({
        where: { id: BigInt(params.eventId) },
        data: { registeredCount: { increment: 1 } },
      });
      await tx.lmsEventTicket.update({
        where: { id: BigInt(params.ticketId) },
        data: { soldCount: { increment: 1 } },
      });
      return reg;
    });

    const amountPaid = ticket.isFree ? 0 : Number(ticket.price);
    if (amountPaid > 0) {
      const { maybeRecordRegistrationCommission } = await import(
        "@/lib/event-platform/commissions/ledger-service"
      );
      await maybeRecordRegistrationCommission({
        organizationId: this.orgId(),
        eventId: BigInt(params.eventId),
        registrationId: row.id,
        grossAmount: amountPaid,
        currency: ticket.currency,
        createdById: BigInt(uid),
      }).catch(() => {
        /* commission is best-effort; registration still succeeds */
      });
    }

    return mapDbRegistration(row);
  }

  async toggleWishlist(eventId: string): Promise<boolean> {
    const uid = this.scope.studentUserId;
    if (!uid) throw new Error("Not signed in");
    const existing = await prisma.lmsEventWishlistItem.findFirst({
      where: {
        organizationId: this.orgId(),
        eventId: BigInt(eventId),
        studentUserId: BigInt(uid),
      },
    });
    if (existing) {
      await prisma.lmsEventWishlistItem.delete({ where: { id: existing.id } });
      return false;
    }
    await prisma.lmsEventWishlistItem.create({
      data: {
        organizationId: this.orgId(),
        eventId: BigInt(eventId),
        studentUserId: BigInt(uid),
        createdById: BigInt(uid),
        updatedById: BigInt(uid),
      },
    });
    return true;
  }

  async createSupportTicket(params: {
    subject: string;
    body: string;
    eventId?: string;
  }): Promise<LmsEventSupportTicket> {
    const uid = this.scope.studentUserId;
    if (!uid) throw new Error("Not signed in");
    const row = await prisma.lmsEventSupportTicket.create({
      data: {
        organizationId: this.orgId(),
        eventId: params.eventId ? BigInt(params.eventId) : null,
        studentUserId: BigInt(uid),
        subject: params.subject,
        status: "open",
        priority: "normal",
        lastReplyAt: new Date(),
        createdById: BigInt(uid),
        updatedById: BigInt(uid),
      },
    });
    return {
      ...auditFrom(row),
      eventId: row.eventId ? idStr(row.eventId) : null,
      registrationId: null,
      studentUserId: idStr(row.studentUserId),
      subject: row.subject,
      status: row.status as LmsEventSupportTicket["status"],
      priority: row.priority as LmsEventSupportTicket["priority"],
      lastReplyAt: row.lastReplyAt ? iso(row.lastReplyAt) : null,
    };
  }

  async getStudentSummary(): Promise<{
    upcomingEventCount: number;
    registeredCount: number;
    certificateCount: number;
    unreadNotifications: number;
    upcoming: Array<{ eventId: string; title: string; startsAt: string; href: string }>;
  }> {
    const uid = this.scope.studentUserId;
    if (!uid) {
      return { upcomingEventCount: 0, registeredCount: 0, certificateCount: 0, unreadNotifications: 0, upcoming: [] };
    }
    const studentId = BigInt(uid);
    const now = new Date();
    const regs = await prisma.lmsEventRegistration.findMany({
      where: { organizationId: this.orgId(), studentUserId: studentId },
      include: { event: true },
    });
    const upcomingRegs = regs.filter(
      (r) => r.event.startsAt >= now && r.bookingStatus !== "cancelled" && r.bookingStatus !== "refunded",
    );
    const upcoming = upcomingRegs
      .map((r) => ({
        eventId: idStr(r.eventId),
        title: r.event.title,
        startsAt: iso(r.event.startsAt),
        href: `/lms/my-events/${idStr(r.eventId)}`,
      }))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .slice(0, 4);

    const [certCount, unread] = await Promise.all([
      prisma.lmsEventCertificate.count({ where: { organizationId: this.orgId(), studentUserId: studentId } }),
      prisma.lmsEventNotification.count({
        where: { organizationId: this.orgId(), userId: studentId, readAt: null },
      }),
    ]);

    return {
      upcomingEventCount: upcomingRegs.length,
      registeredCount: regs.length,
      certificateCount: certCount,
      unreadNotifications: unread,
      upcoming,
    };
  }

  async listCertificates(studentUserId?: string): Promise<LmsEventCertificate[]> {
    const uid = studentUserId ?? this.scope.studentUserId;
    if (!uid) return [];
    const rows = await prisma.lmsEventCertificate.findMany({
      where: { organizationId: this.orgId(), studentUserId: BigInt(uid) },
      orderBy: { issuedAt: "desc" },
    });
    return rows.map((row) => ({
      ...auditFrom(row),
      eventId: idStr(row.eventId),
      registrationId: idStr(row.registrationId),
      studentUserId: idStr(row.studentUserId),
      studentName: row.studentName,
      eventTitle: row.eventTitle,
      certificateStatus: row.certificateStatus as LmsEventCertificate["certificateStatus"],
      issuedAt: row.issuedAt ? iso(row.issuedAt) : null,
      expiresAt: row.expiresAt ? iso(row.expiresAt) : null,
      renewalRequired: row.renewalRequired,
      templateId: row.templateId,
      downloadUrl: row.downloadUrl,
    }));
  }

  async listWishlist(): Promise<LmsEventWishlistItem[]> {
    const uid = this.scope.studentUserId;
    if (!uid) return [];
    const rows = await prisma.lmsEventWishlistItem.findMany({
      where: { organizationId: this.orgId(), studentUserId: BigInt(uid) },
    });
    return rows.map((row) => ({
      ...auditFrom(row),
      eventId: idStr(row.eventId),
      studentUserId: idStr(row.studentUserId),
    }));
  }

  async isWishlisted(eventId: string): Promise<boolean> {
    const list = await this.listWishlist();
    return list.some((w) => w.eventId === eventId);
  }

  async listSupportTickets(): Promise<LmsEventSupportTicket[]> {
    const uid = this.scope.studentUserId;
    if (!uid) return [];
    const rows = await prisma.lmsEventSupportTicket.findMany({
      where: { organizationId: this.orgId(), studentUserId: BigInt(uid) },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => ({
      ...auditFrom(row),
      eventId: row.eventId ? idStr(row.eventId) : null,
      registrationId: null,
      studentUserId: idStr(row.studentUserId),
      subject: row.subject,
      status: row.status as LmsEventSupportTicket["status"],
      priority: row.priority as LmsEventSupportTicket["priority"],
      lastReplyAt: row.lastReplyAt ? iso(row.lastReplyAt) : null,
    }));
  }

  async listNotifications(): Promise<LmsEventNotification[]> {
    const uid = this.scope.studentUserId;
    if (!uid) return [];
    const rows = await prisma.lmsEventNotification.findMany({
      where: { organizationId: this.orgId(), userId: BigInt(uid) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      ...auditFrom(row),
      userId: idStr(row.userId),
      eventId: row.eventId ? idStr(row.eventId) : null,
      kind: row.kind as LmsEventNotification["kind"],
      title: row.title,
      body: row.body,
      readAt: row.readAt ? iso(row.readAt) : null,
    }));
  }

  async getOrganizerKpis(): Promise<LmsEventOrganizerKpis> {
    const orgId = this.orgId();
    const [events, registrations, certificates, openSupport, revenueAgg] = await Promise.all([
      prisma.lmsTrainingEvent.findMany({ where: { organizationId: orgId } }),
      prisma.lmsEventRegistration.count({ where: { organizationId: orgId } }),
      prisma.lmsEventCertificate.count({ where: { organizationId: orgId, certificateStatus: "issued" } }),
      prisma.lmsEventSupportTicket.count({ where: { organizationId: orgId, status: "open" } }),
      prisma.lmsTrainingEvent.aggregate({ where: { organizationId: orgId }, _sum: { revenueTotal: true } }),
    ]);
    const now = Date.now();
    const published = events.filter((e) =>
      ["published", "registration_open", "sold_out", "in_progress"].includes(e.status),
    ).length;
    const upcoming = events.filter((e) => e.startsAt.getTime() > now).length;
    const checkedIn = await prisma.lmsEventRegistration.count({
      where: { organizationId: orgId, checkedInAt: { not: null } },
    });
    const attendanceRate = registrations > 0 ? Math.round((checkedIn / registrations) * 100) : 0;
    const refunds = await prisma.lmsEventTransaction.aggregate({
      where: { organizationId: orgId, status: "refunded" },
      _sum: { amount: true },
    });
    return {
      totalEvents: events.length,
      publishedEvents: published,
      upcomingEvents: upcoming,
      totalRegistrations: registrations,
      attendanceRate,
      totalRevenue: num(revenueAgg._sum.revenueTotal),
      refunds: num(refunds._sum.amount),
      certificatesIssued: certificates,
      openSupportTickets: openSupport,
    };
  }

  async listTransactions(): Promise<LmsEventTransaction[]> {
    const rows = await prisma.lmsEventTransaction.findMany({
      where: { organizationId: this.orgId() },
      orderBy: { processedAt: "desc" },
    });
    return rows.map((row) => ({
      ...auditFrom(row),
      eventId: idStr(row.eventId),
      registrationId: idStr(row.registrationId),
      attendeeName: row.attendeeName,
      amount: num(row.amount),
      currency: row.currency,
      method: row.method,
      status: row.status as LmsEventTransaction["status"],
      processedAt: iso(row.processedAt),
    }));
  }

  async getIncomeReport(): Promise<LmsEventIncomeReport[]> {
    const txs = await this.listTransactions();
    const byMonth = new Map<string, LmsEventIncomeReport>();
    for (const tx of txs) {
      const d = new Date(tx.processedAt);
      const month = d.toLocaleString("en-US", { month: "short" });
      const cur = byMonth.get(month) ?? { month, grossRevenue: 0, refunds: 0, netRevenue: 0, registrationCount: 0 };
      if (tx.status === "refunded") {
        cur.refunds += tx.amount;
      } else if (tx.status === "completed") {
        cur.grossRevenue += tx.amount;
        cur.registrationCount += 1;
      }
      cur.netRevenue = cur.grossRevenue - cur.refunds;
      byMonth.set(month, cur);
    }
    return [...byMonth.values()];
  }

  async listAttendees(eventId: string): Promise<LmsEventAttendee[]> {
    const rows = await prisma.lmsEventRegistration.findMany({
      where: { organizationId: this.orgId(), eventId: BigInt(eventId) },
      include: { ticket: true },
      orderBy: { registeredAt: "desc" },
    });
    return rows.map((row) => ({
      registrationId: idStr(row.id),
      eventId: idStr(row.eventId),
      name: row.attendeeName,
      email: row.attendeeEmail,
      ticketName: row.ticket?.name ?? "—",
      bookingStatus: row.bookingStatus as LmsEventAttendee["bookingStatus"],
      paymentStatus: row.paymentStatus as LmsEventAttendee["paymentStatus"],
      checkedInAt: row.checkedInAt ? iso(row.checkedInAt) : null,
    }));
  }

  async checkInByQrToken(eventId: string, qrToken: string): Promise<LmsEventRegistration | null> {
    const row = await prisma.lmsEventRegistration.findFirst({
      where: {
        organizationId: this.orgId(),
        eventId: BigInt(eventId),
        qrToken: qrToken.trim(),
      },
    });
    if (!row) return null;
    return this.markCheckedIn(row.id);
  }

  async checkInRegistration(eventId: string, registrationId: string): Promise<LmsEventRegistration | null> {
    const row = await prisma.lmsEventRegistration.findFirst({
      where: {
        id: BigInt(registrationId),
        organizationId: this.orgId(),
        eventId: BigInt(eventId),
      },
    });
    if (!row) return null;
    return this.markCheckedIn(row.id);
  }

  private async markCheckedIn(registrationId: bigint): Promise<LmsEventRegistration> {
    const existing = await prisma.lmsEventRegistration.findUnique({ where: { id: registrationId } });
    if (!existing) throw new Error("Registration not found");
    if (existing.checkedInAt) return mapDbRegistration(existing);
    const updated = await prisma.lmsEventRegistration.update({
      where: { id: registrationId },
      data: {
        checkedInAt: new Date(),
        bookingStatus: "checked_in",
        updatedAt: new Date(),
      },
    });
    return mapDbRegistration(updated);
  }
}

export function createLmsEventDbRepository(scope: LmsEventRepositoryScope): LmsEventDbRepository {
  return new LmsEventDbRepository(scope);
}
