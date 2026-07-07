/**
 * Event Platform permission names and helpers.
 * Dot-notation matches marketplace/compliance newer modules; umbrella `manage-event-platform`.
 */

export const EVENT_PLATFORM_PERMISSION_NAMES = [
  "manage-event-platform",
  "events.create",
  "events.view",
  "events.update",
  "events.delete",
  "bookings.view",
  "bookings.manage",
  "vendors.view",
  "vendors.manage",
  "commissions.manage",
  "payouts.manage",
  "payments.manage",
  "cms.manage",
  "menus.manage",
  "settings.manage",
  "roles.manage",
  "integrations.manage",
  "reports.view",
] as const;

export type EventPlatformPermission = (typeof EVENT_PLATFORM_PERMISSION_NAMES)[number];

export const EVENT_PLATFORM_UMBRELLA: EventPlatformPermission = "manage-event-platform";

export const EVENT_PLATFORM_PERMISSION_LABELS: Record<EventPlatformPermission, string> = {
  "manage-event-platform": "Manage Event Platform",
  "events.create": "Create Events",
  "events.view": "View Events",
  "events.update": "Update Events",
  "events.delete": "Delete Events",
  "bookings.view": "View Bookings",
  "bookings.manage": "Manage Bookings",
  "vendors.view": "View Vendors",
  "vendors.manage": "Manage Vendors",
  "commissions.manage": "Manage Commissions",
  "payouts.manage": "Manage Payouts",
  "payments.manage": "Manage Payments",
  "cms.manage": "Manage CMS Pages",
  "menus.manage": "Manage Menus",
  "settings.manage": "Manage Event Platform Settings",
  "roles.manage": "Manage Roles & Admin Users",
  "integrations.manage": "Manage Integrations",
  "reports.view": "View Event Platform Reports",
};

/** Permissions granted to company/staff roles when Event Platform add-on is active. */
export const EVENT_PLATFORM_COMPANY_DEFAULT_PERMISSIONS: readonly EventPlatformPermission[] = [
  "manage-event-platform",
  "events.view",
  "events.create",
  "events.update",
  "bookings.view",
  "bookings.manage",
  "vendors.view",
  "vendors.manage",
  "commissions.manage",
  "payouts.manage",
  "payments.manage",
  "cms.manage",
  "menus.manage",
  "settings.manage",
  "integrations.manage",
  "reports.view",
];

export function userHasEventPlatformPermission(
  permissions: string[],
  required: EventPlatformPermission | string,
): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(EVENT_PLATFORM_UMBRELLA)) return true;
  if (
    permissions.includes("manage-lms-events") &&
    (required === "events.view" ||
      required === "events.create" ||
      required === "events.update" ||
      required === "events.delete" ||
      required === "bookings.view" ||
      required === "bookings.manage")
  ) {
    return true;
  }
  if (
    permissions.includes("manage-lms-event-checkin") &&
    (required === "bookings.manage" || required === "bookings.view")
  ) {
    return true;
  }
  return permissions.includes(required);
}

export function userHasAnyEventPlatformPermission(
  permissions: string[],
  required: readonly string[],
): boolean {
  return required.some((p) => userHasEventPlatformPermission(permissions, p));
}
