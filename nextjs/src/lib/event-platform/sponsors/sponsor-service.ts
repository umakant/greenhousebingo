import "server-only";

import type { EventSponsor } from "@prisma/client";

import type { EventSponsorDto, EventSponsorStatus } from "@/lib/event-platform/sponsors/sponsor-types";
import { prisma } from "@/lib/prisma";

export type { EventSponsorDto } from "@/lib/event-platform/sponsors/sponsor-types";
export { EVENT_SPONSOR_STATUSES } from "@/lib/event-platform/sponsors/sponsor-types";

export function serializeEventSponsor(row: EventSponsor): EventSponsorDto {
  return {
    id: row.id.toString(),
    name: row.name,
    address: row.address,
    phone: row.phone,
    perk: row.perk,
    imageUrl: row.imageUrl,
    website: row.website,
    status: row.status as EventSponsorStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export async function listEventSponsors(organizationId: bigint, includeArchived = false) {
  return prisma.eventSponsor.findMany({
    where: {
      organizationId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export async function getEventSponsorById(organizationId: bigint, id: bigint) {
  return prisma.eventSponsor.findFirst({
    where: { id, organizationId, archivedAt: null },
  });
}
