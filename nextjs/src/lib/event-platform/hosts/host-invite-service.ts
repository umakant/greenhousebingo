import "server-only";

import { randomBytes } from "crypto";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { sendEventHostInviteEmail } from "@/lib/event-platform/hosts/host-invite-email";
import type { EventHostInviteInput } from "@/lib/event-platform/hosts/host-schemas";
import {
  applyAcceptedHostToEvent,
  getEventHostById,
  serializeEventHostInvitation,
} from "@/lib/event-platform/hosts/host-service";
import type { PublicHostInvitePayload } from "@/lib/event-platform/hosts/host-types";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_DAYS = 14;

function newInviteToken(): string {
  return randomBytes(24).toString("hex");
}

function inviteExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_TTL_DAYS);
  return d;
}

function venueLabel(event: {
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
}): string | null {
  const parts = [event.venueName, event.venueCity, event.venueState].map((p) => p?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export async function createEventHostInvitation(params: {
  organizationId: bigint;
  hostId: bigint;
  invitedById: bigint;
  input: EventHostInviteInput;
}): Promise<{ invitation: ReturnType<typeof serializeEventHostInvitation>; email: { ok: boolean; message?: string; devLink?: string } }> {
  const host = await getEventHostById(params.organizationId, params.hostId);
  if (!host) throw new Error("Host not found.");
  if (host.status !== "active") throw new Error("Only active hosts can be invited.");

  let eventId: bigint;
  try {
    eventId = BigInt(params.input.eventId);
  } catch {
    throw new Error("Invalid event.");
  }

  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId: params.organizationId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      venueName: true,
      venueCity: true,
      venueState: true,
      status: true,
    },
  });
  if (!event) throw new Error("Event not found.");

  const existingPending = await prisma.eventHostInvitation.findFirst({
    where: {
      organizationId: params.organizationId,
      hostId: params.hostId,
      eventId: event.id,
      status: "pending",
    },
  });
  if (existingPending) {
    throw new Error("This host already has a pending invitation for this event.");
  }

  const token = newInviteToken();
  const created = await prisma.eventHostInvitation.create({
    data: {
      organizationId: params.organizationId,
      hostId: params.hostId,
      eventId: event.id,
      inviteToken: token,
      status: "pending",
      message: params.input.message?.trim() || null,
      invitedById: params.invitedById,
      expiresAt: inviteExpiresAt(),
    },
    include: {
      host: { select: { displayName: true, email: true } },
      event: { select: { title: true, startsAt: true } },
    },
  });

  const email = await sendEventHostInviteEmail({
    organizationId: params.organizationId,
    to: host.email,
    hostName: host.displayName,
    eventTitle: event.title,
    eventStartsAt: event.startsAt,
    venueLabel: venueLabel(event),
    inviteToken: token,
    message: params.input.message,
  });

  await writeEventAuditLog({
    organizationId: params.organizationId,
    actorUserId: params.invitedById,
    action: "host.invited",
    entityType: "event_host_invitation",
    entityId: created.id.toString(),
    metadata: { hostId: host.id.toString(), eventId: event.id.toString() },
  });

  return { invitation: serializeEventHostInvitation(created), email };
}

export async function revokeEventHostInvitation(params: {
  organizationId: bigint;
  invitationId: bigint;
  actorUserId: bigint;
}): Promise<void> {
  const row = await prisma.eventHostInvitation.findFirst({
    where: { id: params.invitationId, organizationId: params.organizationId },
  });
  if (!row) throw new Error("Invitation not found.");
  if (row.status !== "pending") throw new Error("Only pending invitations can be revoked.");

  await prisma.eventHostInvitation.update({
    where: { id: row.id },
    data: { status: "revoked", respondedAt: new Date(), updatedAt: new Date() },
  });

  await writeEventAuditLog({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "host.invite_revoked",
    entityType: "event_host_invitation",
    entityId: row.id.toString(),
  });
}

export async function getPublicHostInviteByToken(token: string): Promise<PublicHostInvitePayload | null> {
  const row = await prisma.eventHostInvitation.findFirst({
    where: { inviteToken: token },
    include: {
      host: { select: { displayName: true } },
      event: {
        select: {
          title: true,
          startsAt: true,
          venueName: true,
          venueCity: true,
          venueState: true,
        },
      },
      organization: { select: { name: true } },
    },
  });
  if (!row) return null;

  let status = row.status;
  if (status === "pending" && row.expiresAt && row.expiresAt < new Date()) {
    await prisma.eventHostInvitation.update({
      where: { id: row.id },
      data: { status: "expired", updatedAt: new Date() },
    });
    status = "expired";
  }

  return {
    hostName: row.host.displayName,
    eventTitle: row.event.title,
    eventStartsAt: row.event.startsAt.toISOString(),
    venueName: row.event.venueName,
    venueCity: row.event.venueCity,
    venueState: row.event.venueState,
    message: row.message,
    organizationName: row.organization.name,
    status: status as PublicHostInvitePayload["status"],
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

export async function respondToHostInvite(
  token: string,
  action: "accept" | "decline",
): Promise<{ ok: true; status: string } | { ok: false; message: string }> {
  const row = await prisma.eventHostInvitation.findFirst({
    where: { inviteToken: token },
    include: { host: true },
  });
  if (!row) return { ok: false, message: "This invitation link is invalid." };

  if (row.status !== "pending") {
    return { ok: false, message: `This invitation has already been ${row.status}.` };
  }
  if (row.expiresAt && row.expiresAt < new Date()) {
    await prisma.eventHostInvitation.update({
      where: { id: row.id },
      data: { status: "expired", updatedAt: new Date() },
    });
    return { ok: false, message: "This invitation has expired." };
  }

  const nextStatus = action === "accept" ? "accepted" : "declined";
  await prisma.eventHostInvitation.update({
    where: { id: row.id },
    data: { status: nextStatus, respondedAt: new Date(), updatedAt: new Date() },
  });

  if (action === "accept") {
    await applyAcceptedHostToEvent({
      organizationId: row.organizationId,
      eventId: row.eventId,
      host: row.host,
    });
  }

  await writeEventAuditLog({
    organizationId: row.organizationId,
    actorUserId: null,
    action: action === "accept" ? "host.invite_accepted" : "host.invite_declined",
    entityType: "event_host_invitation",
    entityId: row.id.toString(),
    metadata: { hostId: row.hostId.toString(), eventId: row.eventId.toString() },
  });

  return { ok: true, status: nextStatus };
}
