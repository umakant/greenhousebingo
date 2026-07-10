import "server-only";

import { Prisma } from "@prisma/client";
import type { EventVenue } from "@prisma/client";

import type { EventVenueDto, VenueBusinessHours } from "@/lib/event-platform/venues/venue-types";
import { prisma } from "@/lib/prisma";

export type { EventVenueDto } from "@/lib/event-platform/venues/venue-types";
export { EVENT_VENUE_STATUSES, VENUE_WEEKDAYS } from "@/lib/event-platform/venues/venue-types";

function parseBusinessHours(raw: Prisma.JsonValue | null): VenueBusinessHours | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as VenueBusinessHours;
}

export function serializeEventVenue(v: EventVenue): EventVenueDto {
  return {
    id: v.id.toString(),
    organizationId: v.organizationId.toString(),
    name: v.name,
    imageUrl: v.imageUrl,
    phone: v.phone,
    website: v.website,
    address: v.address,
    address2: v.address2,
    city: v.city,
    state: v.state,
    zip: v.zip,
    latitude: v.latitude?.toString() ?? null,
    longitude: v.longitude?.toString() ?? null,
    category: v.category,
    venueType: v.venueType,
    contactFirstName: v.contactFirstName,
    contactLastName: v.contactLastName,
    contactPhone: v.contactPhone,
    contactEmail: v.contactEmail,
    seating: v.seating,
    age21Plus: v.age21Plus,
    drinksAlcohol: v.drinksAlcohol,
    food: v.food,
    businessHours: parseBusinessHours(v.businessHours),
    status: v.status,
    archivedAt: v.archivedAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt?.toISOString() ?? null,
  };
}

export async function listEventVenues(organizationId: bigint, includeArchived = false) {
  return prisma.eventVenue.findMany({
    where: {
      organizationId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ name: "asc" }],
  });
}

export async function getEventVenueById(organizationId: bigint, id: bigint) {
  return prisma.eventVenue.findFirst({
    where: { id, organizationId },
  });
}
