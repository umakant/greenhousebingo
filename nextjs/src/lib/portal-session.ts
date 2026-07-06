const PORTAL_ROLES = new Set([
  "staff",
  "client",
  "vendor",
  "marketplace_vendor",
  "lms-student",
  "lms-instructor",
  "support-staff",
]);

/** True when the session belongs to a portal login (not company admin). */
export function isPortalSession(roles: string[], primaryRole?: string | null): boolean {
  const primary = (primaryRole ?? roles[0] ?? "").trim().toLowerCase();
  if (PORTAL_ROLES.has(primary)) return true;
  const normalized = roles.map((r) => r.trim().toLowerCase());
  if (normalized.includes("superadmin") || normalized.includes("company")) return false;
  return normalized.some((r) => PORTAL_ROLES.has(r));
}
