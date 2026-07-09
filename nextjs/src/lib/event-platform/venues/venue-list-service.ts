import "server-only";

import type { EventVenuesListPayload } from "@/lib/event-platform/venues/venue-types";
import { listEventVenues, serializeEventVenue } from "@/lib/event-platform/venues/venue-service";

export async function getEventVenuesListPayload(organizationId: bigint): Promise<EventVenuesListPayload> {
  const rows = await listEventVenues(organizationId);
  return {
    items: rows.map(serializeEventVenue),
  };
}
