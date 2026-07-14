import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import { dbEventSlugCandidates, publicEventSlug } from "@/lib/company-themes/company-site-events-mapper";
import { assignCustomerClientRoleToUser, ensureCustomerClientRoleWithPermissions } from "@/lib/account-customer-role";
import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import { isBonusBingoCardTicket } from "@/lib/lms-events/event-wizard-input";
import { prisma } from "@/lib/prisma";

export type PublicEventPlant = {
  id: string;
  name: string;
  category: string | null;
  variety: string | null;
  description: string | null;
  imageUrl: string | null;
  quantityRemaining: number;
};

export type PlantBingoPricing = {
  eventId: string;
  slug: string;
  title: string;
  ticketPrice: number;
  extraCardPrice: number;
  cardFeePercent: number;
  cardsIncluded: number;
  seatsLeft: number;
  soldOut: boolean;
  currency: string;
  startsAt: string;
  endsAt: string;
  venueLabel: string;
  primaryTicketId: string | null;
  bonusTicketId: string | null;
};

export type PlantBingoCheckoutTicket = {
  registrationId: string;
  qrToken: string;
  seatNumber: number;
  attendeeName: string;
  attendeeEmail: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function ticketUserEmail(baseEmail: string, orderReference: string, seatIndex: number): string {
  if (seatIndex === 0) return normalizeEmail(baseEmail);
  const [local, domain] = normalizeEmail(baseEmail).split("@");
  const safeRef = orderReference.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
  return `${local}+pb-${safeRef}-${seatIndex + 1}@${domain || "ticket.local"}`;
}

function makeQrToken(eventId: bigint, orderReference: string, seat: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${eventId}:${orderReference}:${seat}:${crypto.randomBytes(8).toString("hex")}`)
    .digest("hex")
    .slice(0, 32);
  return `pb-${hash}`;
}

function makeReference(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PB-${Date.now().toString(36).toUpperCase()}-${part}`;
}

async function nextUserId(): Promise<bigint> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function nextOrderId(): Promise<bigint> {
  const agg = await prisma.order.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function findOrCreateTicketStudentUser(params: {
  ownerId: bigint;
  attendeeName: string;
  attendeeEmail: string;
  orderReference: string;
  seatIndex: number;
}): Promise<bigint> {
  const email = ticketUserEmail(params.attendeeEmail, params.orderReference, params.seatIndex);
  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  if (existing) return existing.id;

  await ensureCustomerClientRoleWithPermissions();
  const hashed = await bcrypt.hash(crypto.randomBytes(12).toString("base64url"), 10);
  const userId = await nextUserId();
  await prisma.user.create({
    data: {
      id: userId,
      name: params.attendeeName,
      email,
      password: hashed,
      type: "client",
      isActive: true,
      isEnableLogin: false,
      createdBy: params.ownerId,
    },
  });
  await assignCustomerClientRoleToUser(userId);
  return userId;
}

function remainingOf(row: {
  quantityPurchased: number;
  quantityAwarded: number;
  quantityRemoved: number;
}): number {
  return Math.max(0, row.quantityPurchased - row.quantityAwarded - row.quantityRemoved);
}

/** Resolve the LMS event row for a public company-site slug. */
export async function resolveCompanySiteLmsEvent(organizationId: bigint, publicSlug: string) {
  const candidates = dbEventSlugCandidates(publicSlug);
  if (candidates.length === 0) return null;
  return prisma.lmsTrainingEvent.findFirst({
    where: {
      organizationId,
      slug: { in: candidates },
      isPublic: true,
      status: { notIn: ["draft", "archived", "cancelled"] },
    },
    include: {
      tickets: true,
    },
  });
}

export async function getPlantBingoPricing(
  organizationId: bigint,
  publicSlug: string,
): Promise<PlantBingoPricing | null> {
  const event = await resolveCompanySiteLmsEvent(organizationId, publicSlug);
  if (!event) return null;

  const detail = parseDetailContent(event.detailContent);
  const mappedTickets = event.tickets.map((t) => ({
    id: t.id.toString(),
    organizationId: organizationId.toString(),
    eventId: event.id.toString(),
    name: t.name,
    description: t.description,
    price: Number(t.price),
    currency: t.currency,
    quantity: t.quantity,
    soldCount: t.soldCount,
    saleStartsAt: t.saleStartsAt?.toISOString() ?? null,
    saleEndsAt: t.saleEndsAt?.toISOString() ?? null,
    ticketStatus: t.ticketStatus as "on_sale" | "sold_out" | "hidden",
    isFree: t.isFree,
    accessRules: typeof t.accessRules === "string" ? t.accessRules : t.accessRules != null ? JSON.stringify(t.accessRules) : null,
  }));
  const bonus = mappedTickets.find(isBonusBingoCardTicket) ?? null;
  const primary =
    mappedTickets.find((t) => !isBonusBingoCardTicket(t)) ?? mappedTickets[0] ?? null;
  const primaryRow = primary
    ? event.tickets.find((t) => t.id.toString() === primary.id) ?? null
    : null;
  const bonusRow = bonus
    ? event.tickets.find((t) => t.id.toString() === bonus.id) ?? null
    : null;

  const ticketPrice =
    primary != null ? Number(primary.price) : event.isFree ? 0 : Number(event.priceFrom ?? 0);
  const extraCardPrice =
    event.extraCardPrice != null
      ? Number(event.extraCardPrice)
      : bonus != null
        ? Number(bonus.price)
        : 5;
  const seatsLeft =
    event.status === "sold_out"
      ? 0
      : event.capacity != null
        ? Math.max(0, event.capacity - event.registeredCount)
        : Math.max(0, (primaryRow?.quantity ?? 0) - (primaryRow?.soldCount ?? 0));

  return {
    eventId: event.id.toString(),
    slug: publicEventSlug(event.slug),
    title: event.title,
    ticketPrice,
    extraCardPrice,
    cardFeePercent: detail?.cardFeePercent ?? 3.5,
    cardsIncluded: event.cardsIncluded ?? 10,
    seatsLeft,
    soldOut: event.status === "sold_out" || seatsLeft <= 0,
    currency: primary?.currency ?? "USD",
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    venueLabel: [event.venueName, event.venueCity, event.venueState].filter(Boolean).join(", "),
    primaryTicketId: primaryRow?.id.toString() ?? null,
    bonusTicketId: bonusRow?.id.toString() ?? null,
  };
}

export function computePlantBingoTotals(input: {
  tickets: number;
  extraCards: number;
  ticketPrice: number;
  extraCardPrice: number;
  cardFeePercent: number;
}): { ticketsSubtotal: number; cardsSubtotal: number; subtotal: number; fee: number; total: number } {
  const tickets = Math.max(0, Math.floor(input.tickets));
  const extraCards = Math.max(0, Math.floor(input.extraCards));
  const ticketsSubtotal = Math.round(tickets * input.ticketPrice * 100) / 100;
  const cardsSubtotal = Math.round(extraCards * input.extraCardPrice * 100) / 100;
  const subtotal = Math.round((ticketsSubtotal + cardsSubtotal) * 100) / 100;
  const fee = Math.round(subtotal * (input.cardFeePercent / 100) * 100) / 100;
  const total = Math.round((subtotal + fee) * 100) / 100;
  return { ticketsSubtotal, cardsSubtotal, subtotal, fee, total };
}

export async function listPublicEventPlants(
  organizationId: bigint,
  publicSlug: string,
): Promise<{ eventId: string; plants: PublicEventPlant[] } | null> {
  const event = await resolveCompanySiteLmsEvent(organizationId, publicSlug);
  if (!event) return null;

  const rows = await prisma.eventPlant.findMany({
    where: {
      organizationId,
      eventId: event.id,
      status: { not: "removed" },
    },
    orderBy: [{ name: "asc" }],
  });

  const plants = rows
    .map((row) => ({
      id: row.id.toString(),
      name: row.name,
      category: row.category,
      variety: row.variety,
      description: row.description,
      imageUrl: row.imageUrl,
      quantityRemaining: remainingOf(row),
    }))
    .filter((p) => p.quantityRemaining > 0);

  return { eventId: event.id.toString(), plants };
}

export async function completePlantBingoCheckout(params: {
  ownerId: bigint;
  companySlug: string;
  publicSlug: string;
  customer: { firstName: string; lastName: string; email: string; phone?: string };
  tickets: number;
  extraCards: number;
  takeHomePlantIds: string[];
  winningPlantIds: string[];
  paid: boolean;
  paymentMode: "none" | "stripe" | "mock";
  paymentIntentId?: string;
}): Promise<
  | {
      ok: true;
      reference: string;
      total: number;
      registrationIds: string[];
      tickets: PlantBingoCheckoutTicket[];
      ticketUrl: string;
    }
  | { ok: false; message: string }
> {
  const pricing = await getPlantBingoPricing(params.ownerId, params.publicSlug);
  if (!pricing) return { ok: false, message: "Event not found." };
  if (pricing.soldOut) return { ok: false, message: "This event is sold out." };

  const ticketCount = Math.floor(params.tickets);
  const extraCards = Math.floor(params.extraCards);
  if (!Number.isFinite(ticketCount) || ticketCount < 1 || ticketCount > 20) {
    return { ok: false, message: "Ticket quantity must be between 1 and 20." };
  }
  if (!Number.isFinite(extraCards) || extraCards < 0 || extraCards > 100) {
    return { ok: false, message: "Extra card quantity is invalid." };
  }
  if (ticketCount > pricing.seatsLeft) {
    return { ok: false, message: `Only ${pricing.seatsLeft} tickets remaining.` };
  }
  if (params.takeHomePlantIds.length !== ticketCount) {
    return {
      ok: false,
      message: `Select exactly ${ticketCount} free take-home plant${ticketCount === 1 ? "" : "s"}.`,
    };
  }
  if (params.winningPlantIds.length > 5) {
    return { ok: false, message: "You can pick at most 5 winning plant preferences." };
  }

  const totals = computePlantBingoTotals({
    tickets: ticketCount,
    extraCards,
    ticketPrice: pricing.ticketPrice,
    extraCardPrice: pricing.extraCardPrice,
    cardFeePercent: pricing.cardFeePercent,
  });

  const eventId = BigInt(pricing.eventId);
  const plantIds = [...new Set([...params.takeHomePlantIds, ...params.winningPlantIds])];
  const plantRows =
    plantIds.length > 0
      ? await prisma.eventPlant.findMany({
          where: {
            organizationId: params.ownerId,
            eventId,
            id: { in: plantIds.map((id) => BigInt(id)) },
            status: { not: "removed" },
          },
        })
      : [];
  const plantById = new Map(plantRows.map((p) => [p.id.toString(), p]));

  for (const id of plantIds) {
    if (!plantById.has(id)) return { ok: false, message: "One or more selected plants are unavailable." };
  }

  // Validate take-home inventory against requested counts.
  const takeHomeCounts = new Map<string, number>();
  for (const id of params.takeHomePlantIds) {
    takeHomeCounts.set(id, (takeHomeCounts.get(id) ?? 0) + 1);
  }
  for (const [id, count] of takeHomeCounts) {
    const plant = plantById.get(id)!;
    if (remainingOf(plant) < count) {
      return { ok: false, message: `Not enough inventory for ${plant.name}.` };
    }
  }

  const attendeeName = `${params.customer.firstName} ${params.customer.lastName}`.trim();
  const attendeeEmail = normalizeEmail(params.customer.email);
  const reference = makeReference();
  const primaryTicketId = pricing.primaryTicketId ? BigInt(pricing.primaryTicketId) : null;

  const createdTickets: PlantBingoCheckoutTicket[] = [];
  const registrationIds: string[] = [];

  for (let seat = 0; seat < ticketCount; seat++) {
    const studentUserId = await findOrCreateTicketStudentUser({
      ownerId: params.ownerId,
      attendeeName,
      attendeeEmail,
      orderReference: reference,
      seatIndex: seat,
    });

    const qrToken = makeQrToken(eventId, reference, seat);
    const amountPaid = params.paid ? pricing.ticketPrice : 0;

    const reg = await prisma.$transaction(async (tx) => {
      const row = await tx.lmsEventRegistration.create({
        data: {
          organizationId: params.ownerId,
          eventId,
          ticketId: primaryTicketId,
          studentUserId,
          bookingStatus: params.paid ? "confirmed" : "pending",
          attendeeName,
          attendeeEmail,
          paymentStatus: params.paid ? "paid" : "unpaid",
          amountPaid: new Prisma.Decimal(amountPaid),
          currency: pricing.currency || "USD",
          qrToken,
          createdById: params.ownerId,
          updatedById: params.ownerId,
        },
      });

      await tx.lmsTrainingEvent.update({
        where: { id: eventId },
        data: { registeredCount: { increment: 1 } },
      });
      if (primaryTicketId) {
        await tx.lmsEventTicket.update({
          where: { id: primaryTicketId },
          data: { soldCount: { increment: 1 } },
        });
      }

      if (params.paid && amountPaid > 0) {
        await tx.lmsEventTransaction.create({
          data: {
            organizationId: params.ownerId,
            eventId,
            registrationId: row.id,
            attendeeName,
            amount: new Prisma.Decimal(amountPaid),
            currency: pricing.currency || "USD",
            status: "completed",
            method: "company_website",
            createdById: params.ownerId,
          },
        });
      }

      // Attach this seat's take-home plant.
      const takeHomeId = params.takeHomePlantIds[seat];
      if (takeHomeId) {
        const plant = plantById.get(takeHomeId)!;
        await tx.eventPlantRequest.create({
          data: {
            organizationId: params.ownerId,
            eventId,
            registrationId: row.id,
            eventPlantId: plant.id,
            requestedPlantName: plant.name,
            requestType: "take_home",
            quantity: 1,
            priority: 1,
            notes: "Selected at public checkout",
          },
        });
      }

      // Winning preferences go on the first seat only (one preference list per purchaser).
      if (seat === 0) {
        for (let i = 0; i < params.winningPlantIds.length; i++) {
          const winId = params.winningPlantIds[i];
          const plant = plantById.get(winId)!;
          await tx.eventPlantRequest.create({
            data: {
              organizationId: params.ownerId,
              eventId,
              registrationId: row.id,
              eventPlantId: plant.id,
              requestedPlantName: plant.name,
              requestType: "winning",
              quantity: 1,
              priority: i + 1,
              notes: "Winning preference from public checkout",
            },
          });
        }
      }

      return row;
    });

    registrationIds.push(reg.id.toString());
    createdTickets.push({
      registrationId: reg.id.toString(),
      qrToken: reg.qrToken,
      seatNumber: seat + 1,
      attendeeName,
      attendeeEmail,
    });
  }

  // Record bonus-card sale as a lumped transaction on the first registration when paid.
  if (params.paid && extraCards > 0 && createdTickets[0] && pricing.extraCardPrice > 0) {
    await prisma.lmsEventTransaction.create({
      data: {
        organizationId: params.ownerId,
        eventId,
        registrationId: BigInt(createdTickets[0].registrationId),
        attendeeName,
        amount: new Prisma.Decimal(Math.round(extraCards * pricing.extraCardPrice * 100) / 100),
        currency: pricing.currency || "USD",
        status: "completed",
        method: "company_website",
        createdById: params.ownerId,
      },
    });
  }

  // Card fee as a separate transaction on the first registration when paid.
  if (params.paid && totals.fee > 0 && createdTickets[0]) {
    await prisma.lmsEventTransaction.create({
      data: {
        organizationId: params.ownerId,
        eventId,
        registrationId: BigInt(createdTickets[0].registrationId),
        attendeeName,
        amount: new Prisma.Decimal(totals.fee),
        currency: pricing.currency || "USD",
        status: "completed",
        method: "company_website",
        createdById: params.ownerId,
      },
    });
  }

  const orderId = await nextOrderId();
  await prisma.order.create({
    data: {
      id: orderId,
      orderId: reference,
      name: attendeeName,
      email: attendeeEmail,
      amount: new Prisma.Decimal(totals.total),
      price: new Prisma.Decimal(totals.total),
      status: params.paid ? "completed" : "pending",
      paymentStatus: params.paid ? "succeeded" : "pending",
      paymentType: "plant_bingo_checkout",
      paymentMethod: params.paymentMode === "stripe" ? "stripe" : params.paymentMode === "mock" ? "test" : "company_website",
      transactionId: params.paymentIntentId ?? null,
      txnId: params.paymentIntentId ?? null,
      currency: pricing.currency || "USD",
      createdBy: params.ownerId,
      metadata: JSON.stringify({
        source: "plant_bingo_checkout",
        companySlug: params.companySlug,
        eventSlug: pricing.slug,
        eventId: pricing.eventId,
        tickets: ticketCount,
        extraCards,
        takeHomePlantIds: params.takeHomePlantIds,
        winningPlantIds: params.winningPlantIds,
        registrationIds,
        paymentIntentId: params.paymentIntentId ?? null,
        fee: totals.fee,
        subtotal: totals.subtotal,
        ticketsIssued: createdTickets,
      }),
    },
  });

  return {
    ok: true,
    reference,
    total: totals.total,
    registrationIds,
    tickets: createdTickets,
    ticketUrl: `/sites/${encodeURIComponent(params.companySlug)}/ticket/${encodeURIComponent(reference)}`,
  };
}
