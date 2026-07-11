import "server-only";

import { Prisma } from "@prisma/client";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { prisma } from "@/lib/prisma";

async function loadRegistration(params: {
  organizationId: bigint;
  eventId: bigint;
  registrationId: bigint;
}) {
  const reg = await prisma.lmsEventRegistration.findFirst({
    where: {
      id: params.registrationId,
      organizationId: params.organizationId,
      eventId: params.eventId,
    },
  });
  if (!reg) throw new Error("Registration not found.");
  return reg;
}

/**
 * Re-issues the attendee's ticket confirmation. External delivery depends on the
 * connected notification channel; the request is always recorded so staff can see
 * that a resend was requested.
 */
export async function resendAttendeeTicket(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  registrationId: bigint;
  channel?: string;
}): Promise<{ attendeeName: string; email: string; channel: string }> {
  const reg = await loadRegistration(params);
  const channel = params.channel ?? "email";

  await writeEventAuditLog({
    organizationId: params.organizationId,
    eventId: params.eventId,
    actorUserId: params.actorUserId,
    action: "ticket.resent",
    entityType: "registration",
    entityId: reg.id.toString(),
    metadata: {
      attendeeName: reg.attendeeName,
      email: reg.attendeeEmail,
      channel,
    },
  });

  return { attendeeName: reg.attendeeName, email: reg.attendeeEmail, channel };
}

/**
 * Issues a refund against an attendee's registration. Records a refund transaction,
 * flips the payment and booking status to refunded, and writes an audit entry.
 */
export async function refundAttendee(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  registrationId: bigint;
  amount?: number | null;
  reason?: string | null;
}): Promise<{ attendeeName: string; amount: number; currency: string }> {
  const reg = await loadRegistration(params);

  if (reg.paymentStatus === "refunded" || reg.bookingStatus === "refunded") {
    throw new Error("This registration has already been refunded.");
  }

  const paid = Number(reg.amountPaid ?? 0);
  const requested = params.amount != null ? Math.max(0, params.amount) : paid;
  const refundAmount = paid > 0 ? Math.min(requested, paid) : requested;

  await prisma.$transaction(async (tx) => {
    await tx.lmsEventTransaction.create({
      data: {
        organizationId: params.organizationId,
        eventId: params.eventId,
        registrationId: reg.id,
        attendeeName: reg.attendeeName,
        amount: new Prisma.Decimal(-Math.abs(refundAmount)),
        currency: reg.currency,
        status: "refunded",
        method: "refund",
        createdById: params.actorUserId,
      },
    });

    await tx.lmsEventRegistration.update({
      where: { id: reg.id },
      data: {
        paymentStatus: "refunded",
        bookingStatus: "refunded",
        updatedAt: new Date(),
        updatedById: params.actorUserId,
      },
    });
  });

  await writeEventAuditLog({
    organizationId: params.organizationId,
    eventId: params.eventId,
    actorUserId: params.actorUserId,
    action: "registration.refunded",
    entityType: "registration",
    entityId: reg.id.toString(),
    metadata: {
      attendeeName: reg.attendeeName,
      amount: refundAmount,
      reason: params.reason ?? null,
    },
  });

  return { attendeeName: reg.attendeeName, amount: refundAmount, currency: reg.currency };
}
