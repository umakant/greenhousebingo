import type { LmsEventCreateWizardInput, LmsEventListFiltersInput } from "@/lib/lms-events/schemas";
import { shouldAutoArchiveEvent } from "@/lib/lms-events/event-lifecycle";
import type {
  LmsEventAttendee,
  LmsEvent,
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
import {
  MOCK_LMS_EVENT_CATEGORIES,
  MOCK_LMS_EVENT_CERTIFICATES,
  MOCK_LMS_EVENT_INCOME_REPORT,
  MOCK_LMS_EVENT_NOTIFICATIONS,
  MOCK_LMS_EVENT_ORGANIZER_KPIS,
  MOCK_LMS_EVENT_REGISTRATIONS,
  MOCK_LMS_EVENT_SUPPORT_TICKETS,
  MOCK_LMS_EVENT_TICKETS,
  MOCK_LMS_EVENT_TRANSACTIONS,
  MOCK_LMS_EVENT_WISHLIST,
  MOCK_LMS_EVENTS,
} from "@/lib/lms-events/mock-data";

/** Mutable in-memory stores for Phase 3 mock interactions (reset on server restart). */
let registrationStore = [...MOCK_LMS_EVENT_REGISTRATIONS];
let wishlistStore = [...MOCK_LMS_EVENT_WISHLIST];
let supportStore = [...MOCK_LMS_EVENT_SUPPORT_TICKETS];
let notificationStore = [...MOCK_LMS_EVENT_NOTIFICATIONS];
let eventStore = [...MOCK_LMS_EVENTS];
let ticketStore = [...MOCK_LMS_EVENT_TICKETS];

export type LmsEventMockRepositoryScope = {
  organizationId: string;
  studentUserId?: string;
};

function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesFilters(event: LmsEvent, filters: LmsEventListFiltersInput): boolean {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const hay = `${event.title} ${event.shortDescription ?? ""} ${event.categoryName ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.categoryId && event.categoryId !== filters.categoryId) return false;
  if (filters.eventType && event.eventType !== filters.eventType) return false;
  if (filters.deliveryMode && event.deliveryMode !== filters.deliveryMode) return false;
  if (filters.freeOnly && !event.isFree) return false;
  if (filters.paidOnly && event.isFree) return false;
  if (filters.certificationOnly && !event.certificationAvailable) return false;
  if (filters.dateFrom && new Date(event.startsAt) < new Date(filters.dateFrom)) return false;
  if (filters.dateTo && new Date(event.startsAt) > new Date(filters.dateTo)) return false;
  if (filters.location) {
    const loc = filters.location.toLowerCase();
    const blob = `${event.venueCity ?? ""} ${event.venueName ?? ""} ${event.venueState ?? ""}`.toLowerCase();
    if (!blob.includes(loc)) return false;
  }
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    if (!statuses.includes(event.status)) return false;
  } else if (!filters.includeArchived && event.status === "archived") {
    return false;
  }
  return true;
}

function learnerVisible(event: LmsEvent): boolean {
  return event.isPublic && !["draft", "archived", "cancelled"].includes(event.status);
}

function scopeOrg<T extends { organizationId: string }>(rows: T[], organizationId: string): T[] {
  const scoped = rows.filter((r) => r.organizationId === organizationId);
  if (scoped.length > 0) return scoped;
  return rows.map((r) => ({ ...r, organizationId }));
}

function scopeOrgUser<T extends { organizationId: string; studentUserId: string }>(
  rows: T[],
  organizationId: string,
  studentUserId: string,
): T[] {
  const scoped = rows.filter((r) => r.organizationId === organizationId && r.studentUserId === studentUserId);
  if (scoped.length > 0) return scoped;
  const orgRows = scopeOrg(rows, organizationId);
  return orgRows.map((r) => ({ ...r, studentUserId }));
}

/** Mock repository — swap for Prisma services in Phase 5. */
export class LmsEventMockRepository {
  constructor(private readonly scope: LmsEventMockRepositoryScope) {}

  private events(): LmsEvent[] {
    return scopeOrg(eventStore, this.scope.organizationId);
  }

  async listCategories(): Promise<LmsEventCategory[]> {
    await delay();
    return scopeOrg(MOCK_LMS_EVENT_CATEGORIES, this.scope.organizationId);
  }

  private autoArchivePastEvents(): void {
    const nowIso = new Date().toISOString();
    eventStore = eventStore.map((event) =>
      shouldAutoArchiveEvent(event) ? { ...event, status: "archived", updatedAt: nowIso } : event,
    );
  }

  async listEvents(filters: LmsEventListFiltersInput = {}): Promise<LmsEvent[]> {
    await delay();
    this.autoArchivePastEvents();
    return this.events().filter((e) => learnerVisible(e) && matchesFilters(e, filters));
  }

  async listAdminEvents(filters: LmsEventListFiltersInput = {}): Promise<LmsEvent[]> {
    await delay();
    this.autoArchivePastEvents();
    return this.events().filter((e) => matchesFilters(e, filters));
  }

  async createAdminEvent(
    input: LmsEventCreateWizardInput,
    actorUserId?: string,
  ): Promise<{ event: LmsEvent; ticket: LmsEventTicket }> {
    await delay();
    const now = new Date().toISOString();
    const id = `ev-${Date.now()}`;
    const orgId = this.scope.organizationId;
    const actor = actorUserId ?? this.scope.studentUserId ?? orgId;
    const categories = await this.listCategories();
    const category = categories.find((c) => c.id === input.categoryId);
    const isFree = input.isFree || input.price <= 0;
    const event: LmsEvent = {
      id,
      organizationId: orgId,
      createdAt: now,
      updatedAt: now,
      createdById: actor,
      updatedById: actor,
      status: input.status === "draft" ? "draft" : input.status || "registration_open",
      title: input.title.trim(),
      slug: input.slug?.trim() || input.title.toLowerCase().replace(/\s+/g, "-"),
      description: input.description?.trim() || null,
      shortDescription: input.shortDescription?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      categoryId: input.categoryId,
      categoryName: category?.name ?? null,
      eventType: input.eventType,
      deliveryMode: input.deliveryMode,
      instructorName: input.instructorName?.trim() || null,
      instructorUserId: input.instructorUserId?.trim() || null,
      startsAt: new Date(input.startsAt).toISOString(),
      endsAt: new Date(input.endsAt).toISOString(),
      timezone: input.timezone || "America/New_York",
      venueName: input.venueName?.trim() || null,
      venueAddress: input.venueAddress?.trim() || null,
      venueCity: input.venueCity?.trim() || null,
      venueState: input.venueState?.trim() || null,
      venuePostalCode: input.venuePostalCode?.trim() || null,
      venueCountry: input.venueCountry?.trim() || null,
      venueLat: input.venueLat ?? null,
      venueLng: input.venueLng ?? null,
      onlineMeetingUrl: input.onlineMeetingUrl?.trim() || null,
      capacity: input.capacity ?? input.quantity ?? null,
      registeredCount: 0,
      seatsRemaining: input.capacity ?? input.quantity ?? null,
      isPublic: input.isPublic,
      isFree,
      priceFrom: isFree ? 0 : input.price,
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
      extraCardPrice: input.extraCardPrice ?? null,
      foodAndDrinks: input.foodAndDrinks?.trim() || null,
      attire: input.attire?.trim() || null,
      linkedCourseId: null,
      linkedLiveSessionId: null,
      revenueTotal: 0,
      detailContent: null,
    };
    const ticket: LmsEventTicket = {
      id: `tkt-${Date.now()}`,
      organizationId: orgId,
      eventId: id,
      createdAt: now,
      updatedAt: now,
      createdById: actor,
      updatedById: actor,
      name: input.ticketName.trim(),
      description: input.ticketDescription?.trim() || null,
      price: isFree ? 0 : input.price,
      currency: input.currency || "USD",
      quantity: input.quantity ?? null,
      soldCount: 0,
      saleStartsAt: input.saleStartsAt || null,
      saleEndsAt: input.saleEndsAt || null,
      ticketStatus: input.ticketStatus || "available",
      isFree,
      accessRules: null,
    };
    eventStore = [...eventStore, event];
    ticketStore = [...ticketStore, ticket];
    return { event, ticket };
  }

  async updateAdminEvent(
    eventId: string,
    input: LmsEventCreateWizardInput,
    actorUserId?: string,
  ): Promise<{ event: LmsEvent; ticket: LmsEventTicket }> {
    await delay();
    const existing = await this.getEventById(eventId);
    if (!existing) throw new Error("Event not found.");

    const orgId = this.scope.organizationId;
    const actor = actorUserId ?? this.scope.studentUserId ?? orgId;
    const categories = await this.listCategories();
    const category = categories.find((c) => c.id === input.categoryId);
    const isFree = input.isFree || input.price <= 0;
    const publishStatus = input.soldOut
      ? "sold_out"
      : input.status === "draft"
        ? "draft"
        : input.status || "registration_open";
    const now = new Date().toISOString();

    const event: LmsEvent = {
      ...existing,
      updatedAt: now,
      updatedById: actor,
      status: publishStatus,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      shortDescription: input.shortDescription?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      categoryId: input.categoryId,
      categoryName: category?.name ?? null,
      eventType: input.eventType,
      deliveryMode: input.deliveryMode,
      instructorName: input.instructorName?.trim() || null,
      instructorUserId: input.instructorUserId?.trim() || null,
      startsAt: new Date(input.startsAt).toISOString(),
      endsAt: new Date(input.endsAt).toISOString(),
      timezone: input.timezone || "America/New_York",
      venueName: input.venueName?.trim() || null,
      venueAddress: input.venueAddress?.trim() || null,
      venueCity: input.venueCity?.trim() || null,
      venueState: input.venueState?.trim() || null,
      venuePostalCode: input.venuePostalCode?.trim() || null,
      venueCountry: input.venueCountry?.trim() || null,
      venueLat: input.venueLat ?? null,
      venueLng: input.venueLng ?? null,
      onlineMeetingUrl: input.onlineMeetingUrl?.trim() || null,
      capacity: input.capacity ?? input.quantity ?? null,
      seatsRemaining:
        (input.capacity ?? input.quantity ?? null) != null
          ? Math.max(0, (input.capacity ?? input.quantity ?? 0) - existing.registeredCount)
          : null,
      isPublic: input.isPublic,
      isFree,
      priceFrom: isFree ? 0 : input.price,
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
      extraCardPrice: input.extraCardPrice ?? null,
      foodAndDrinks: input.foodAndDrinks?.trim() || null,
      attire: input.attire?.trim() || null,
    };

    const tickets = await this.listTickets(eventId);
    const primary = tickets.find((t) => t.name !== "Extra bingo card") ?? tickets[0];
    const ticket: LmsEventTicket = primary
      ? {
          ...primary,
          updatedAt: now,
          updatedById: actor,
          name: input.ticketName.trim(),
          description: input.ticketDescription?.trim() || null,
          price: isFree ? 0 : input.price,
          currency: input.currency || "USD",
          quantity: input.quantity ?? null,
          saleStartsAt: input.saleStartsAt || null,
          saleEndsAt: input.saleEndsAt || null,
          ticketStatus: input.ticketStatus || "available",
          isFree,
        }
      : {
          id: `tkt-${Date.now()}`,
          organizationId: orgId,
          eventId,
          createdAt: now,
          updatedAt: now,
          createdById: actor,
          updatedById: actor,
          name: input.ticketName.trim(),
          description: input.ticketDescription?.trim() || null,
          price: isFree ? 0 : input.price,
          currency: input.currency || "USD",
          quantity: input.quantity ?? null,
          soldCount: 0,
          saleStartsAt: input.saleStartsAt || null,
          saleEndsAt: input.saleEndsAt || null,
          ticketStatus: input.ticketStatus || "available",
          isFree,
          accessRules: null,
        };

    eventStore = eventStore.map((e) => (e.id === eventId ? event : e));
    ticketStore = primary
      ? ticketStore.map((t) => (t.id === primary.id ? ticket : t))
      : [...ticketStore, ticket];

    return { event, ticket };
  }

  async getEventById(id: string): Promise<LmsEvent | null> {
    await delay();
    return this.events().find((e) => e.id === id) ?? null;
  }

  async listTickets(eventId: string): Promise<LmsEventTicket[]> {
    await delay();
    return scopeOrg(ticketStore, this.scope.organizationId).filter((t) => t.eventId === eventId);
  }

  async listMyRegistrations(tab?: "upcoming" | "completed" | "cancelled" | "waitlisted"): Promise<LmsEventRegistration[]> {
    await delay();
    const uid = this.scope.studentUserId;
    if (!uid) return [];
    const rows = scopeOrgUser(registrationStore, this.scope.organizationId, uid);
    if (!tab) return rows;
    const now = Date.now();
    return rows.filter((r) => {
      const event = this.events().find((e) => e.id === r.eventId);
      if (tab === "cancelled") return r.bookingStatus === "cancelled" || r.bookingStatus === "refunded";
      if (tab === "waitlisted") return r.bookingStatus === "waitlisted";
      if (tab === "completed") return r.bookingStatus === "completed" || (event && new Date(event.endsAt).getTime() < now);
      return ["confirmed", "checked_in", "pending"].includes(r.bookingStatus) && event && new Date(event.startsAt).getTime() >= now;
    });
  }

  async getRegistration(eventId: string, studentUserId?: string): Promise<LmsEventRegistration | null> {
    await delay();
    const uid = studentUserId ?? this.scope.studentUserId;
    if (!uid) return null;
    return scopeOrgUser(registrationStore, this.scope.organizationId, uid).find((r) => r.eventId === eventId) ?? null;
  }

  async registerForEvent(params: {
    eventId: string;
    ticketId: string;
    attendeeName: string;
    attendeeEmail: string;
  }): Promise<LmsEventRegistration> {
    await delay();
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

    const id = `reg-${Date.now()}`;
    const reg: LmsEventRegistration = {
      id,
      organizationId: this.scope.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: uid,
      updatedById: uid,
      eventId: params.eventId,
      ticketId: params.ticketId,
      studentUserId: uid,
      bookingStatus: ticket.isFree ? "confirmed" : "pending",
      attendeeName: params.attendeeName,
      attendeeEmail: params.attendeeEmail,
      paymentStatus: ticket.isFree ? "comped" : "unpaid",
      amountPaid: ticket.isFree ? 0 : ticket.price,
      currency: ticket.currency,
      registeredAt: new Date().toISOString(),
      checkedInAt: null,
      qrToken: `QR-${params.eventId.toUpperCase()}-${id}`,
    };
    registrationStore = [...registrationStore, reg];
    return reg;
  }

  async toggleWishlist(eventId: string): Promise<boolean> {
    await delay();
    const uid = this.scope.studentUserId;
    if (!uid) throw new Error("Not signed in");
    const idx = wishlistStore.findIndex(
      (w) => w.organizationId === this.scope.organizationId && w.studentUserId === uid && w.eventId === eventId,
    );
    if (idx >= 0) {
      wishlistStore = wishlistStore.filter((_, i) => i !== idx);
      return false;
    }
    wishlistStore = [
      ...wishlistStore,
      {
        id: `wish-${Date.now()}`,
        organizationId: this.scope.organizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: uid,
        updatedById: uid,
        eventId,
        studentUserId: uid,
      },
    ];
    return true;
  }

  async createSupportTicket(params: {
    subject: string;
    body: string;
    eventId?: string;
  }): Promise<LmsEventSupportTicket> {
    await delay();
    const uid = this.scope.studentUserId;
    if (!uid) throw new Error("Not signed in");
    const ticket: LmsEventSupportTicket = {
      id: `sup-${Date.now()}`,
      organizationId: this.scope.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: uid,
      updatedById: uid,
      eventId: params.eventId ?? null,
      registrationId: null,
      studentUserId: uid,
      subject: params.subject,
      status: "open",
      priority: "normal",
      lastReplyAt: new Date().toISOString(),
    };
    supportStore = [...supportStore, ticket];
    return ticket;
  }

  async getStudentSummary(): Promise<{
    upcomingEventCount: number;
    registeredCount: number;
    certificateCount: number;
    unreadNotifications: number;
    upcoming: Array<{ eventId: string; title: string; startsAt: string; href: string }>;
  }> {
    await delay();
    const uid = this.scope.studentUserId;
    const now = Date.now();
    const regs = uid ? scopeOrgUser(registrationStore, this.scope.organizationId, uid) : [];
    const upcomingRegs = regs.filter((r) => {
      const event = this.events().find((e) => e.id === r.eventId);
      return event && new Date(event.startsAt).getTime() >= now && r.bookingStatus !== "cancelled";
    });
    const upcoming = upcomingRegs
      .map((r) => {
        const event = this.events().find((e) => e.id === r.eventId);
        if (!event) return null;
        return {
          eventId: event.id,
          title: event.title,
          startsAt: event.startsAt,
          href: `/lms/my-events/${event.id}`,
        };
      })
      .filter(Boolean) as Array<{ eventId: string; title: string; startsAt: string; href: string }>;

    const certs = uid ? scopeOrgUser(MOCK_LMS_EVENT_CERTIFICATES, this.scope.organizationId, uid) : [];
    const notifications = uid ? await this.listNotifications() : [];

    return {
      upcomingEventCount: upcoming.length,
      registeredCount: regs.length,
      certificateCount: certs.length,
      unreadNotifications: notifications.filter((n) => !n.readAt).length,
      upcoming: upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).slice(0, 4),
    };
  }

  async listCertificates(studentUserId?: string): Promise<LmsEventCertificate[]> {
    await delay();
    const uid = studentUserId ?? this.scope.studentUserId;
    if (!uid) return [];
    return scopeOrgUser(MOCK_LMS_EVENT_CERTIFICATES, this.scope.organizationId, uid);
  }

  async listWishlist(): Promise<LmsEventWishlistItem[]> {
    await delay();
    const uid = this.scope.studentUserId;
    if (!uid) return [];
    return scopeOrgUser(wishlistStore, this.scope.organizationId, uid);
  }

  async isWishlisted(eventId: string): Promise<boolean> {
    const list = await this.listWishlist();
    return list.some((w) => w.eventId === eventId);
  }

  async listSupportTickets(): Promise<LmsEventSupportTicket[]> {
    await delay();
    const uid = this.scope.studentUserId;
    if (!uid) return [];
    return scopeOrgUser(supportStore, this.scope.organizationId, uid);
  }

  async listNotifications(): Promise<LmsEventNotification[]> {
    await delay();
    const uid = this.scope.studentUserId;
    if (!uid) return [];
    const orgScoped = scopeOrg(notificationStore, this.scope.organizationId);
    const mine = orgScoped.filter((n) => n.userId === uid);
    if (mine.length > 0) return mine;
    return orgScoped.map((n) => ({ ...n, userId: uid }));
  }

  async getOrganizerKpis(): Promise<LmsEventOrganizerKpis> {
    await delay();
    return MOCK_LMS_EVENT_ORGANIZER_KPIS;
  }

  async listTransactions(): Promise<LmsEventTransaction[]> {
    await delay();
    return MOCK_LMS_EVENT_TRANSACTIONS.filter((t) => t.organizationId === this.scope.organizationId);
  }

  async getIncomeReport(): Promise<LmsEventIncomeReport[]> {
    await delay();
    return MOCK_LMS_EVENT_INCOME_REPORT;
  }

  async listAttendees(eventId: string): Promise<LmsEventAttendee[]> {
    await delay();
    const tickets = await this.listTickets(eventId);
    const ticketName = (id: string) => tickets.find((t) => t.id === id)?.name ?? "—";
    return scopeOrg(registrationStore, this.scope.organizationId)
      .filter((r) => r.eventId === eventId)
      .map((r) => ({
        registrationId: r.id,
        eventId: r.eventId,
        name: r.attendeeName,
        email: r.attendeeEmail,
        ticketName: ticketName(r.ticketId),
        bookingStatus: r.bookingStatus,
        paymentStatus: r.paymentStatus,
        checkedInAt: r.checkedInAt,
      }));
  }

  async checkInByQrToken(eventId: string, qrToken: string): Promise<LmsEventRegistration | null> {
    await delay();
    const idx = registrationStore.findIndex(
      (r) =>
        r.organizationId === this.scope.organizationId &&
        r.eventId === eventId &&
        r.qrToken === qrToken.trim(),
    );
    if (idx < 0) return null;
    return this.markCheckedInAt(idx);
  }

  async checkInRegistration(eventId: string, registrationId: string): Promise<LmsEventRegistration | null> {
    await delay();
    const idx = registrationStore.findIndex(
      (r) =>
        r.organizationId === this.scope.organizationId &&
        r.eventId === eventId &&
        r.id === registrationId,
    );
    if (idx < 0) return null;
    return this.markCheckedInAt(idx);
  }

  private markCheckedInAt(idx: number): LmsEventRegistration {
    const row = registrationStore[idx]!;
    if (row.checkedInAt) return row;
    const updated: LmsEventRegistration = {
      ...row,
      checkedInAt: new Date().toISOString(),
      bookingStatus: "checked_in",
      updatedAt: new Date().toISOString(),
    };
    registrationStore = registrationStore.map((r, i) => (i === idx ? updated : r));
    return updated;
  }
}

export function createLmsEventMockRepository(scope: LmsEventMockRepositoryScope): LmsEventMockRepository {
  return new LmsEventMockRepository(scope);
}
