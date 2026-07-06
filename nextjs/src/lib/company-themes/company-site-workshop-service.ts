import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import type { NormalizedCompanySiteCheckoutItem } from "@/lib/company-themes/company-site-checkout-pricing";
import type { CompanySiteCatalogItem } from "@/lib/company-themes/win-with-barlow-catalog";
import {
  getWinWithBarlowWorkshopByCatalogId,
  lmsWorkshopEventSlug,
  makeWorkshopQrToken,
  workshopRegisteredCount,
  workshopTicketStatus,
} from "@/lib/company-themes/win-with-barlow-workshops";
import { getWorkshopVenueMetaForCatalogItem, workshopCatalogSlug } from "@/lib/company-themes/company-site-workshop-meta";
import { getWinWithBarlowCatalogItem } from "@/lib/company-themes/win-with-barlow-catalog";
import { assignCustomerClientRoleToUser, ensureCustomerClientRoleWithPermissions } from "@/lib/account-customer-role";
import { prisma } from "@/lib/prisma";

export type CompanySiteWorkshopTicket = {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  attendeeName: string;
  attendeeEmail: string;
  qrToken: string;
  bookingStatus: string;
  startsAt: string;
  endsAt: string;
  locationLabel: string;
  unitPrice: number;
  seatNumber: number;
  quantityTotal: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function ticketUserEmail(baseEmail: string, orderReference: string, seatIndex: number): string {
  if (seatIndex === 0) return normalizeEmail(baseEmail);
  const [local, domain] = normalizeEmail(baseEmail).split("@");
  const safeRef = orderReference.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
  return `${local}+ws-${safeRef}-${seatIndex + 1}@${domain || "ticket.local"}`;
}

async function nextUserId(): Promise<bigint> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
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
    select: { id: true, type: true },
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

async function ensureWorkshopEvent(
  ownerId: bigint,
  catalogItem: NormalizedCompanySiteCheckoutItem,
): Promise<{ eventId: bigint; ticketId: bigint }> {
  const catalogSlug = workshopCatalogSlug(getWinWithBarlowCatalogItem(catalogItem.id)!);
  if (!catalogSlug) throw new Error(`Not a workshop: ${catalogItem.id}`);

  const siteWorkshop = getWinWithBarlowWorkshopByCatalogId(catalogItem.id);
  const meta = getWorkshopVenueMetaForCatalogItem(catalogItem.id);
  if (!meta || !siteWorkshop) throw new Error(`Unknown workshop: ${catalogSlug}`);

  const slug = lmsWorkshopEventSlug(catalogSlug);
  let event = await prisma.lmsTrainingEvent.findFirst({
    where: { organizationId: ownerId, slug },
    select: { id: true },
  });

  if (event) {
    await prisma.lmsTrainingEvent.update({
      where: { id: event.id },
      data: {
        title: catalogItem.title,
        shortDescription: siteWorkshop.shortDescription,
        description: siteWorkshop.description,
        imageUrl: siteWorkshop.imageUrl,
        startsAt: meta.startsAt,
        endsAt: meta.endsAt,
        timezone: siteWorkshop.timezone,
        venueName: meta.venueName,
        venueCity: meta.city,
        venueState: meta.state,
        capacity: meta.capacity,
        priceFrom: new Prisma.Decimal(catalogItem.unitPrice),
        status: siteWorkshop.soldOut ? "sold_out" : "published",
        requirements: siteWorkshop.requirements,
        cancellationPolicy: siteWorkshop.cancellationPolicy,
        updatedAt: new Date(),
        updatedById: ownerId,
      },
    });
  } else {
    event = await prisma.lmsTrainingEvent.create({
      data: {
        organizationId: ownerId,
        slug,
        title: catalogItem.title,
        shortDescription: siteWorkshop.shortDescription,
        description: siteWorkshop.description,
        imageUrl: siteWorkshop.imageUrl,
        eventType: "live_workshop",
        deliveryMode: "in_person",
        status: siteWorkshop.soldOut ? "sold_out" : "published",
        instructorName: siteWorkshop.instructorName,
        startsAt: meta.startsAt,
        endsAt: meta.endsAt,
        timezone: siteWorkshop.timezone,
        venueName: meta.venueName,
        venueCity: meta.city,
        venueState: meta.state,
        venueCountry: "US",
        capacity: meta.capacity,
        registeredCount: workshopRegisteredCount(siteWorkshop),
        isPublic: true,
        isFree: false,
        priceFrom: new Prisma.Decimal(catalogItem.unitPrice),
        currency: "USD",
        requirements: siteWorkshop.requirements,
        cancellationPolicy: siteWorkshop.cancellationPolicy,
        createdById: ownerId,
        updatedById: ownerId,
      },
      select: { id: true },
    });
  }

  let ticket = await prisma.lmsEventTicket.findFirst({
    where: { eventId: event.id, organizationId: ownerId },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!ticket) {
    ticket = await prisma.lmsEventTicket.create({
      data: {
        organizationId: ownerId,
        eventId: event.id,
        name: "General admission",
        price: new Prisma.Decimal(catalogItem.unitPrice),
        currency: "USD",
        quantity: meta.capacity,
        soldCount: workshopRegisteredCount(siteWorkshop),
        ticketStatus: workshopTicketStatus(siteWorkshop),
        isFree: false,
        createdById: ownerId,
        updatedById: ownerId,
      },
      select: { id: true },
    });
  }

  return { eventId: event.id, ticketId: ticket.id };
}

export async function registerCompanySiteWorkshops(params: {
  ownerId: bigint;
  companySlug: string;
  orderReference: string;
  orderId: bigint;
  mode: "checkout" | "reserve";
  paid: boolean;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  items: NormalizedCompanySiteCheckoutItem[];
}): Promise<CompanySiteWorkshopTicket[]> {
  const workshopItems = params.items.filter((item) => item.type === "workshop");
  if (workshopItems.length === 0) return [];

  const attendeeName = `${params.customer.firstName} ${params.customer.lastName}`.trim();
  const attendeeEmail = normalizeEmail(params.customer.email);
  const tickets: CompanySiteWorkshopTicket[] = [];

  for (const item of workshopItems) {
    const catalog = getWinWithBarlowCatalogItem(item.id);
    if (!catalog) continue;
    const catalogSlug = workshopCatalogSlug(catalog);
    if (!catalogSlug) continue;
    const siteWorkshop = getWinWithBarlowWorkshopByCatalogId(item.id);
    const meta = getWorkshopVenueMetaForCatalogItem(item.id);
    if (!meta || !siteWorkshop) continue;

    const { eventId, ticketId } = await ensureWorkshopEvent(params.ownerId, item);

    for (let seat = 0; seat < item.quantity; seat++) {
      const studentUserId = await findOrCreateTicketStudentUser({
        ownerId: params.ownerId,
        attendeeName,
        attendeeEmail,
        orderReference: params.orderReference,
        seatIndex: seat,
      });

      const existing = await prisma.lmsEventRegistration.findFirst({
        where: { eventId, studentUserId },
        include: {
          event: {
            select: {
              title: true,
              slug: true,
              startsAt: true,
              endsAt: true,
              venueCity: true,
              venueState: true,
            },
          },
        },
      });

      if (existing) {
        tickets.push({
          registrationId: existing.id.toString(),
          eventId: eventId.toString(),
          eventTitle: existing.event.title,
          eventSlug: existing.event.slug,
          attendeeName: existing.attendeeName,
          attendeeEmail: existing.attendeeEmail,
          qrToken: existing.qrToken,
          bookingStatus: existing.bookingStatus,
          startsAt: existing.event.startsAt.toISOString(),
          endsAt: existing.event.endsAt.toISOString(),
          locationLabel: [existing.event.venueCity, existing.event.venueState].filter(Boolean).join(", ") || meta.venueName,
          unitPrice: item.unitPrice,
          seatNumber: seat + 1,
          quantityTotal: item.quantity,
        });
        continue;
      }

      const bookingStatus = params.mode === "reserve" ? "pending" : params.paid ? "confirmed" : "pending";
      const paymentStatus = params.mode === "reserve" ? "unpaid" : params.paid ? "paid" : "unpaid";
      const qrToken = makeWorkshopQrToken(eventId, params.orderReference, seat);

      const reg = await prisma.$transaction(async (tx) => {
        const row = await tx.lmsEventRegistration.create({
          data: {
            organizationId: params.ownerId,
            eventId,
            ticketId,
            studentUserId,
            bookingStatus,
            attendeeName,
            attendeeEmail,
            paymentStatus,
            amountPaid: params.paid ? new Prisma.Decimal(item.unitPrice) : new Prisma.Decimal(0),
            currency: "USD",
            qrToken,
            createdById: params.ownerId,
            updatedById: params.ownerId,
          },
        });

        await tx.lmsTrainingEvent.update({
          where: { id: eventId },
          data: { registeredCount: { increment: 1 } },
        });
        await tx.lmsEventTicket.update({
          where: { id: ticketId },
          data: { soldCount: { increment: 1 } },
        });

        if (params.paid && item.unitPrice > 0) {
          await tx.lmsEventTransaction.create({
            data: {
              organizationId: params.ownerId,
              eventId,
              registrationId: row.id,
              attendeeName,
              amount: new Prisma.Decimal(item.unitPrice),
              currency: "USD",
              status: "completed",
              method: "company_website",
              createdById: params.ownerId,
            },
          });
        }

        return row;
      });

      tickets.push({
        registrationId: reg.id.toString(),
        eventId: eventId.toString(),
        eventTitle: catalog.title,
        eventSlug: lmsWorkshopEventSlug(catalogSlug),
        attendeeName,
        attendeeEmail,
        qrToken: reg.qrToken,
        bookingStatus: reg.bookingStatus,
        startsAt: meta.startsAt.toISOString(),
        endsAt: meta.endsAt.toISOString(),
        locationLabel: `${meta.city}, ${meta.state}`,
        unitPrice: item.unitPrice,
        seatNumber: seat + 1,
        quantityTotal: item.quantity,
      });
    }
  }

  return tickets;
}

type OrderWorkshopMetadata = {
  workshopTickets?: CompanySiteWorkshopTicket[];
};

export async function getWorkshopTicketsByOrderReference(params: {
  ownerId: bigint;
  orderReference: string;
  email?: string;
}): Promise<CompanySiteWorkshopTicket[]> {
  const order = await prisma.order.findFirst({
    where: { orderId: params.orderReference, createdBy: params.ownerId },
    select: { metadata: true, email: true },
  });
  if (!order) return [];
  if (params.email && normalizeEmail(params.email) !== normalizeEmail(order.email ?? "")) return [];

  let parsed: OrderWorkshopMetadata | null = null;
  try {
    parsed = order.metadata ? (JSON.parse(order.metadata) as OrderWorkshopMetadata) : null;
  } catch {
    return [];
  }
  return parsed?.workshopTickets ?? [];
}
