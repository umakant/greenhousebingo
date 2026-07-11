import "server-only";

import type { EventHost, EventHostInvitation, LmsTrainingEvent } from "@prisma/client";

import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import { buildEventHostDisplayName } from "@/lib/event-platform/hosts/host-display-name";
import type {
  EventHostDto,
  EventHostInvitationDto,
  EventHostInvitationStatus,
  EventHostStatus,
} from "@/lib/event-platform/hosts/host-types";
import { prisma } from "@/lib/prisma";

export type { EventHostDto, EventHostInvitationDto } from "@/lib/event-platform/hosts/host-types";
export { EVENT_HOST_STATUSES, EVENT_HOST_INVITATION_STATUSES } from "@/lib/event-platform/hosts/host-types";

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:5000").replace(/\/$/, "");
}

export function buildHostInviteUrl(token: string): string {
  return `${appBaseUrl()}/event-host-invite/${encodeURIComponent(token)}`;
}

export function serializeEventHost(
  row: EventHost,
  counts?: { pending: number; accepted: number },
): EventHostDto {
  return {
    id: row.id.toString(),
    displayName: row.displayName,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    bio: row.bio,
    imageUrl: row.imageUrl,
    status: row.status as EventHostStatus,
    linkedUserId: row.linkedUserId?.toString() ?? null,
    pendingInvites: counts?.pending ?? 0,
    acceptedInvites: counts?.accepted ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function serializeEventHostInvitation(
  row: EventHostInvitation & {
    host: Pick<EventHost, "displayName" | "email">;
    event: Pick<LmsTrainingEvent, "title" | "startsAt">;
  },
): EventHostInvitationDto {
  return {
    id: row.id.toString(),
    hostId: row.hostId.toString(),
    hostName: row.host.displayName,
    hostEmail: row.host.email,
    eventId: row.eventId.toString(),
    eventTitle: row.event.title,
    eventStartsAt: row.event.startsAt.toISOString(),
    status: row.status as EventHostInvitationStatus,
    message: row.message,
    inviteToken: row.inviteToken,
    inviteUrl: buildHostInviteUrl(row.inviteToken),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function hostDisplayNameFromFields(input: { firstName: string; lastName: string }) {
  return buildEventHostDisplayName(input);
}

export async function listEventHosts(organizationId: bigint): Promise<EventHostDto[]> {
  const rows = await prisma.eventHost.findMany({
    where: { organizationId, archivedAt: null },
    orderBy: [{ status: "asc" }, { displayName: "asc" }],
  });

  const hostIds = rows.map((r) => r.id);
  const inviteCounts =
    hostIds.length > 0
      ? await prisma.eventHostInvitation.groupBy({
          by: ["hostId", "status"],
          where: { organizationId, hostId: { in: hostIds } },
          _count: { _all: true },
        })
      : [];

  const countMap = new Map<string, { pending: number; accepted: number }>();
  for (const row of inviteCounts) {
    const key = row.hostId.toString();
    const cur = countMap.get(key) ?? { pending: 0, accepted: 0 };
    if (row.status === "pending") cur.pending = row._count._all;
    if (row.status === "accepted") cur.accepted = row._count._all;
    countMap.set(key, cur);
  }

  return rows.map((r) => serializeEventHost(r, countMap.get(r.id.toString())));
}

export async function listEventHostInvitations(organizationId: bigint): Promise<EventHostInvitationDto[]> {
  const rows = await prisma.eventHostInvitation.findMany({
    where: { organizationId },
    include: {
      host: { select: { displayName: true, email: true } },
      event: { select: { title: true, startsAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(serializeEventHostInvitation);
}

export async function getEventHostById(organizationId: bigint, id: bigint) {
  return prisma.eventHost.findFirst({
    where: { id, organizationId, archivedAt: null },
  });
}

export async function getEventHostByIdForOrg(organizationId: bigint, id: bigint) {
  return prisma.eventHost.findFirst({
    where: { id, organizationId },
  });
}

export async function applyAcceptedHostToEvent(params: {
  organizationId: bigint;
  eventId: bigint;
  host: Pick<EventHost, "displayName" | "bio" | "imageUrl">;
}) {
  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: params.eventId, organizationId: params.organizationId },
    select: { id: true, detailContent: true, instructorName: true },
  });
  if (!event) return;

  const existing = parseDetailContent(event.detailContent) ?? {};
  const detailContent = {
    ...existing,
    host: {
      name: params.host.displayName,
      bio: params.host.bio?.trim() || "",
      imageUrl: params.host.imageUrl?.trim() || undefined,
    },
  };

  await prisma.lmsTrainingEvent.update({
    where: { id: event.id },
    data: {
      detailContent,
      instructorName: event.instructorName?.trim() || params.host.displayName,
      updatedAt: new Date(),
    },
  });
}
