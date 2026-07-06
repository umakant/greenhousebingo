/** Client-safe helpers for portal impersonation menu visibility. */

function hasAny(permissions: string[], names: string[]): boolean {
  if (permissions.includes("*")) return true;
  return names.some((n) => permissions.includes(n));
}

/** Company admins with module access may impersonate portal users (matches API). */
export function canImpersonatePortalUsers(permissions: string[]): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes("impersonate-portal-users")) return true;
  return hasAny(permissions, [
    "manage-account",
    "manage-customers",
    "manage-vendors",
    "manage-hrm",
    "manage-employees",
    "manage-lms",
    "manage-lms-students",
    "manage-lms-instructors",
    "manage-lms-courses",
  ]);
}

export function canImpersonateEmployees(permissions: string[]): boolean {
  if (!canImpersonatePortalUsers(permissions)) return false;
  return hasAny(permissions, ["manage-hrm", "manage-employees", "impersonate-portal-users"]);
}

export function canImpersonateCustomers(permissions: string[]): boolean {
  if (!canImpersonatePortalUsers(permissions)) return false;
  return hasAny(permissions, ["manage-account", "manage-customers", "impersonate-portal-users"]);
}

export function canImpersonateVendors(permissions: string[]): boolean {
  if (!canImpersonatePortalUsers(permissions)) return false;
  return hasAny(permissions, ["manage-account", "manage-vendors", "impersonate-portal-users"]);
}

export function canImpersonateLmsStudents(permissions: string[]): boolean {
  if (!canImpersonatePortalUsers(permissions)) return false;
  return hasAny(permissions, [
    "manage-lms",
    "manage-lms-students",
    "manage-lms-courses",
    "impersonate-portal-users",
  ]);
}

export function canImpersonateLmsInstructors(permissions: string[]): boolean {
  if (!canImpersonatePortalUsers(permissions)) return false;
  return hasAny(permissions, ["manage-lms", "manage-lms-instructors", "impersonate-portal-users"]);
}
