import type { EventHost, EventVenue } from "@prisma/client";

import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import { matchVenueToEvent } from "@/lib/event-platform/venues/venue-dashboard-stats";
import { serializeEventVenue } from "@/lib/event-platform/venues/venue-service";
import type { EventVenueDto } from "@/lib/event-platform/venues/venue-types";

export type EventVenueMatchRow = {
  id: bigint;
  venueName: string | null;
  detailContent: unknown;
};

export type EventHostMatchRow = {
  id: bigint;
  instructorName: string | null;
  detailContent: unknown;
};

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function hostNamesFromEvent(row: EventHostMatchRow): string[] {
  const detail = parseDetailContent(row.detailContent);
  const names = [row.instructorName, detail?.host?.name].map(normalizeName).filter(Boolean);
  return [...new Set(names)];
}

export function hostNamesFromCatalog(host: Pick<EventHost, "displayName" | "firstName" | "lastName">): string[] {
  const names = [
    host.displayName,
    [host.firstName, host.lastName].filter(Boolean).join(" "),
    host.firstName,
    host.lastName,
  ]
    .map(normalizeName)
    .filter(Boolean);
  return [...new Set(names)];
}

export function eventMatchesHost(
  event: EventHostMatchRow,
  host: Pick<EventHost, "displayName" | "firstName" | "lastName">,
): boolean {
  const eventNames = hostNamesFromEvent(event);
  const hostNames = hostNamesFromCatalog(host);
  if (!eventNames.length || !hostNames.length) return false;
  return eventNames.some((a) => hostNames.some((b) => a === b || a.includes(b) || b.includes(a)));
}

export function serializeVenueRow(row: EventVenue): EventVenueDto {
  return serializeEventVenue(row);
}

export function resolveCatalogVenue(
  venues: EventVenueDto[],
  event: EventVenueMatchRow,
): EventVenueDto | null {
  const detail = parseDetailContent(event.detailContent);
  const catalogId = detail?.venueHostOps?.catalogVenueId?.trim();
  if (catalogId) {
    const byId = venues.find((v) => v.id === catalogId);
    if (byId) return byId;
  }
  const matched = venues.filter((v) => matchVenueToEvent(v, event.venueName));
  if (matched.length === 1) return matched[0]!;
  if (matched.length > 1) {
    const exact = matched.find((v) => normalizeName(v.name) === normalizeName(event.venueName));
    return exact ?? matched[0]!;
  }
  return null;
}

export function eventMatchesVenue(
  event: EventVenueMatchRow,
  venue: EventVenueDto | null,
  anchorVenueName: string | null,
): boolean {
  if (venue) return matchVenueToEvent(venue, event.venueName);
  const anchor = normalizeName(anchorVenueName);
  const name = normalizeName(event.venueName);
  return Boolean(anchor && name && anchor === name);
}

export type CatalogHostMatch = Pick<
  EventHost,
  "id" | "displayName" | "firstName" | "lastName" | "email" | "phone" | "imageUrl"
>;

export function resolveCatalogHost(
  hosts: CatalogHostMatch[],
  event: EventHostMatchRow,
): CatalogHostMatch | null {
  const detail = parseDetailContent(event.detailContent);
  const catalogId = detail?.venueHostOps?.catalogHostId?.trim();
  if (catalogId) {
    const byId = hosts.find((h) => h.id.toString() === catalogId);
    if (byId) return byId;
  }
  const matched = hosts.filter((h) => eventMatchesHost(event, h));
  if (matched.length === 1) return matched[0]!;
  if (matched.length > 1) return matched[0]!;
  return null;
}
