/** Venue Management admin route constants. */
export const VENUE_MANAGEMENT_BASE = "/admin/venue-management";

export const VENUE_MANAGEMENT_PATHS = {
  dashboard: VENUE_MANAGEMENT_BASE,
  venues: VENUE_MANAGEMENT_BASE,
  categories: `${VENUE_MANAGEMENT_BASE}/categories`,
  types: `${VENUE_MANAGEMENT_BASE}/types`,
} as const;
