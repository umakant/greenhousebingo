import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import { assignCustomerClientRoleToUser, ensureCustomerClientRoleWithPermissions } from "@/lib/account-customer-role";
import { isBonusTicketRow } from "@/lib/event-platform/attendees/event-attendees-helpers";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import type { WalkInInput } from "@/lib/event-platform/live-event/live-event-types";
import { prisma } from "@/lib/prisma";

async function nextUserId(): Promise<bigint> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

function walkInEmail(baseEmail: string | undefined, phone: string, seatIndex: number): string {
  const digits = phone.replace(/\D/g, "").slice(-10) || "guest";
  if (baseEmail?.trim()) {
    const normalized = baseEmail.trim().toLowerCase();
    if (seatIndex === 0) return normalized;
    const [local, domain] = normalized.split("@");
    return `${local}+walkin-${seatIndex + 1}@${domain || "walkin.local"}`;
  }
  return `walkin+${digits}-${seatIndex + 1}@event.local`;
}

async function findOrCreateWalkInGuestUser(params: {
  organizationId: bigint;
  attendeeName: string;
  email: string;
  phone: string;
  createdById: bigint;
}): Promise<bigint> {
  const existing = await prisma.user.findFirst({
    where: { email: params.email },
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
      email: params.email,
      password: hashed,
      type: "client",
      isActive: true,
      isEnableLogin: false,
      mobileNo: params.phone.trim() || null,
      createdBy: params.createdById,
    },
  });
  await assignCustomerClientRoleToUser(userId);
  return userId;
}

export async function createWalkInRegistration(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  input: WalkInInput;
}): Promise<{ registrationId: string; qrToken: string; alreadyCheckedIn: boolean }> {
  const { input } = params;
  const quantity = Math.max(1, Math.min(20, input.quantity ?? 1));
  const ticket = await prisma.lmsEventTicket.findFirst({
    where: { id: BigInt(input.ticketId), organizationId: params.organizationId, eventId: params.eventId },
  });
  if (!ticket) throw new Error("Ticket tier not found.");
  if (ticket.ticketStatus === "sold_out" || ticket.ticketStatus === "closed") {
    throw new Error("Ticket tier is not available.");
  }

  const attendeeName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  if (!attendeeName) throw new Error("Attendee name is required.");
  if (!input.phone.trim()) throw new Error("Phone is required.");

  const primaryEmail = walkInEmail(input.email, input.phone, 0);
  const studentUserId = await findOrCreateWalkInGuestUser({
    organizationId: params.organizationId,
    attendeeName,
    email: primaryEmail,
    phone: input.phone,
    createdById: params.actorUserId,
  });

  const existingReg = await prisma.lmsEventRegistration.findFirst({
    where: { eventId: params.eventId, studentUserId },
  });
  if (existingReg) {
    throw new Error("This guest already has a registration for this event.");
  }

  const unitPrice = Number(ticket.price);
  const totalAmount = input.amount > 0 ? input.amount : unitPrice * quantity;
  const paymentStatus =
    input.paymentMethod === "comp" || ticket.isFree ? "comped" : input.paymentMethod === "cash" || input.paymentMethod === "card" ? "paid" : "pending";
  const bookingStatus = paymentStatus === "pending" ? "pending" : "confirmed";
  const qrToken = `QR-${params.eventId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date();
  const checkInNow = Boolean(input.checkInNow);

  const reg = await prisma.$transaction(async (tx) => {
    const row = await tx.lmsEventRegistration.create({
      data: {
        organizationId: params.organizationId,
        eventId: params.eventId,
        ticketId: ticket.id,
        studentUserId,
        bookingStatus: checkInNow ? "checked_in" : bookingStatus,
        attendeeName,
        attendeeEmail: primaryEmail,
        paymentStatus,
        amountPaid: new Prisma.Decimal(totalAmount),
        currency: ticket.currency,
        checkedInAt: checkInNow ? now : null,
        qrToken,
        registrationSource: "walk_in",
        sourceName: "Live Event Walk-In",
        createdById: params.actorUserId,
        updatedById: params.actorUserId,
        attributionMetadata: {
          phone: input.phone.trim(),
          walkIn: true,
          marketingConsent: Boolean(input.marketingConsent),
          bonusCardsRequested: input.bonusCards ?? 0,
        } as Prisma.InputJsonValue,
      },
    });

    await tx.lmsTrainingEvent.update({
      where: { id: params.eventId },
      data: { registeredCount: { increment: 1 } },
    });
    await tx.lmsEventTicket.update({
      where: { id: ticket.id },
      data: { soldCount: { increment: 1 } },
    });

    if (paymentStatus === "paid" && totalAmount > 0) {
      await tx.lmsEventTransaction.create({
        data: {
          organizationId: params.organizationId,
          eventId: params.eventId,
          registrationId: row.id,
          attendeeName,
          amount: new Prisma.Decimal(totalAmount),
          currency: ticket.currency,
          status: "completed",
          method: input.paymentMethod,
          createdById: params.actorUserId,
        },
      });
    }

    return row;
  });

  await writeEventAuditLog({
    organizationId: params.organizationId,
    eventId: params.eventId,
    actorUserId: params.actorUserId,
    action: "registration.walk_in",
    entityType: "registration",
    entityId: reg.id.toString(),
    metadata: { attendeeName, ticketName: ticket.name, amount: totalAmount },
  });

  if (checkInNow) {
    await writeEventAuditLog({
      organizationId: params.organizationId,
      eventId: params.eventId,
      actorUserId: params.actorUserId,
      action: "registration.checked_in",
      entityType: "registration",
      entityId: reg.id.toString(),
      metadata: { attendeeName, source: "walk_in" },
    });
  }

  return {
    registrationId: reg.id.toString(),
    qrToken: reg.qrToken,
    alreadyCheckedIn: checkInNow,
  };
}

export async function sellBonusCards(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  registrationId: bigint;
  quantity: number;
  unitPrice: number;
  paymentMethod: string;
  discountAmount?: number;
}): Promise<{ transactionIds: string[]; total: number }> {
  const qty = Math.max(1, Math.min(50, params.quantity));
  const reg = await prisma.lmsEventRegistration.findFirst({
    where: { id: params.registrationId, organizationId: params.organizationId, eventId: params.eventId },
    include: { ticket: true },
  });
  if (!reg) throw new Error("Registration not found.");

  const bonusTicket = await prisma.lmsEventTicket.findFirst({
    where: { organizationId: params.organizationId, eventId: params.eventId },
  });
  const tickets = await prisma.lmsEventTicket.findMany({
    where: { organizationId: params.organizationId, eventId: params.eventId },
  });
  const bonusTier = tickets.find((t) => isBonusTicketRow(t)) ?? bonusTicket;
  const unit = params.unitPrice > 0 ? params.unitPrice : bonusTier ? Number(bonusTier.price) : 0;
  const discount = Math.max(0, params.discountAmount ?? 0);
  const lineTotal = Math.max(0, unit * qty - discount);

  const ids: string[] = [];
  await prisma.$transaction(async (tx) => {
    const txRow = await tx.lmsEventTransaction.create({
      data: {
        organizationId: params.organizationId,
        eventId: params.eventId,
        registrationId: reg.id,
        attendeeName: reg.attendeeName,
        amount: new Prisma.Decimal(lineTotal),
        currency: reg.currency,
        status: "completed",
        method: params.paymentMethod,
        createdById: params.actorUserId,
      },
    });
    ids.push(txRow.id.toString());
    if (bonusTier && !isBonusTicketRow(reg.ticket)) {
      await tx.lmsEventTicket.update({
        where: { id: bonusTier.id },
        data: { soldCount: { increment: qty } },
      });
    }
  });

  await writeEventAuditLog({
    organizationId: params.organizationId,
    eventId: params.eventId,
    actorUserId: params.actorUserId,
    action: "bonus_cards.sold",
    entityType: "registration",
    entityId: reg.id.toString(),
    metadata: { quantity: qty, total: lineTotal, attendeeName: reg.attendeeName },
  });

  return { transactionIds: ids, total: lineTotal };
}

export async function undoCheckIn(params: {
  organizationId: bigint;
  eventId: bigint;
  registrationId: bigint;
  actorUserId: bigint;
}): Promise<void> {
  const reg = await prisma.lmsEventRegistration.findFirst({
    where: { id: params.registrationId, organizationId: params.organizationId, eventId: params.eventId },
  });
  if (!reg) throw new Error("Registration not found.");
  if (!reg.checkedInAt) throw new Error("Attendee is not checked in.");

  await prisma.lmsEventRegistration.update({
    where: { id: reg.id },
    data: {
      checkedInAt: null,
      bookingStatus: reg.paymentStatus === "paid" || reg.paymentStatus === "comped" ? "confirmed" : "pending",
      updatedAt: new Date(),
      updatedById: params.actorUserId,
    },
  });

  await writeEventAuditLog({
    organizationId: params.organizationId,
    eventId: params.eventId,
    actorUserId: params.actorUserId,
    action: "registration.check_in_undone",
    entityType: "registration",
    entityId: reg.id.toString(),
    metadata: { attendeeName: reg.attendeeName },
  });
}
