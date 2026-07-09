/**
 * Venue Management permission names and helpers.
 */

export const VENUE_MANAGEMENT_PERMISSION_NAMES = [
  "manage-venue-management",
  "manage-venue-management-dashboard",
  "venues.view",
  "venues.manage",
] as const;

export type VenueManagementPermission = (typeof VENUE_MANAGEMENT_PERMISSION_NAMES)[number];

export const VENUE_MANAGEMENT_UMBRELLA: VenueManagementPermission = "manage-venue-management";

export const VENUE_MANAGEMENT_PERMISSION_LABELS: Record<VenueManagementPermission, string> = {
  "manage-venue-management": "Manage Venue Management",
  "manage-venue-management-dashboard": "Venue Management Dashboard",
  "venues.view": "View Venues",
  "venues.manage": "Manage Venues",
};

export const VENUE_MANAGEMENT_COMPANY_DEFAULT_PERMISSIONS: readonly VenueManagementPermission[] = [
  "manage-venue-management",
  "manage-venue-management-dashboard",
  "venues.view",
  "venues.manage",
];

export function userHasVenueManagementPermission(
  permissions: string[],
  required: VenueManagementPermission | string,
): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(VENUE_MANAGEMENT_UMBRELLA)) return true;
  if (
    permissions.includes("manage-lms-events") &&
    (required === "venues.view" || required === "venues.manage" || required === "manage-venue-management-dashboard")
  ) {
    return true;
  }
  return permissions.includes(required);
}

export function userHasAnyVenueManagementPermission(
  permissions: string[],
  required: readonly string[],
): boolean {
  return required.some((p) => userHasVenueManagementPermission(permissions, p));
}
