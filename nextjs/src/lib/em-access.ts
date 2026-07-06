/**
 * Expense Management access matrix (client + server safe).
 * Company admins: full org data when they have plan/role permissions.
 * Portal users (customer / employee / vendor): operational EM only, own records via API scope.
 */

export const EM_PORTAL_SUBMITTER_TYPES = ["staff", "client", "vendor"] as const;

export const EM_WORKFLOW_REVIEWER_TYPES = ["expense-supervisor", "expense-billing"] as const;

export const EM_ADMIN_PERMISSION = "manage-expense-management";

export const EM_OPERATIONAL_PERMISSIONS = [
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
] as const;

/** Routes reserved for company expense administrators (not portal self-service). */
export const EM_ADMIN_ROUTE_PREFIXES = [
  "/expense-management/setup",
  "/expense-management/operation-details",
  "/expense-management/matter-notes",
  "/expense-management/matter-documents",
  "/expense-management/cost-transfer",
  "/expense-management/client-billing",
  "/expense-management/time-sheets",
  "/expense-management/approval-timeline",
] as const;

export function isEmPortalSubmitterType(userType: string | null | undefined): boolean {
  const t = (userType ?? "").trim().toLowerCase();
  return (EM_PORTAL_SUBMITTER_TYPES as readonly string[]).includes(t);
}

export function isEmPortalSubmitterRole(roles: string[], userType?: string | null): boolean {
  if (isEmPortalSubmitterType(userType)) return true;
  const normalized = roles.map((r) => r.trim().toLowerCase());
  return normalized.some((r) => (EM_PORTAL_SUBMITTER_TYPES as readonly string[]).includes(r));
}

export function isEmCompanyActorType(userType: string | null | undefined): boolean {
  const t = (userType ?? "").trim().toLowerCase();
  return t === "company" || t === "company_admin";
}

export function isEmWorkflowReviewerType(userType: string | null | undefined): boolean {
  const t = (userType ?? "").trim().toLowerCase();
  return (EM_WORKFLOW_REVIEWER_TYPES as readonly string[]).includes(t);
}

/** Supervisor or billing queue — sees organization reports, not admin setup routes. */
export function isEmWorkflowReviewer(
  permissions: string[],
  roles: string[] = [],
  userType?: string | null,
): boolean {
  if (permissions.includes("*")) return false;
  if (permissions.includes("approve-expense-reports")) return true;
  if (permissions.includes("manage-expense-billing")) return true;
  const normalized = roles.map((r) => r.trim().toLowerCase());
  if (normalized.includes("expense-supervisor") || normalized.includes("expense-billing")) return true;
  return isEmWorkflowReviewerType(userType);
}

export function hasAnyEmOperationalPermission(permissions: string[]): boolean {
  if (permissions.includes("*")) return true;
  return EM_OPERATIONAL_PERMISSIONS.some((p) => permissions.includes(p));
}

export function hasEmAdminPermission(permissions: string[]): boolean {
  return permissions.includes("*") || permissions.includes(EM_ADMIN_PERMISSION);
}

/** Company tenant admins see all organization expense records (not portal submitters). */
export function canManageAllOrganizationExpenses(
  permissions: string[],
  roles: string[] = [],
  userType?: string | null,
): boolean {
  if (permissions.includes("*")) return true;
  if (isEmWorkflowReviewer(permissions, roles, userType)) return true;
  if (isEmPortalSubmitterRole(roles, userType)) return false;
  if (isEmCompanyActorType(userType)) return true;
  return permissions.includes(EM_ADMIN_PERMISSION);
}

export function isEmAdminRoute(pathname: string): boolean {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "";
  return EM_ADMIN_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Minimum permission for a route; null if unknown path. */
export function resolveEmRoutePermission(pathname: string): string | null {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "";
  if (isEmAdminRoute(path)) return EM_ADMIN_PERMISSION;
  if (path === "/expense-management" || path === "/expense-management/") {
    return "manage-expense-management-dashboard";
  }
  if (path.startsWith("/expense-management/reports")) return "manage-expense-reports";
  if (path.startsWith("/expense-management/expenses")) return "manage-expense-entries";
  if (path.startsWith("/expense-management/receipts")) return "manage-expense-receipts";
  if (path.startsWith("/expense-management/analytics")) return "manage-expense-analytics";
  return null;
}

export function userMayAccessEmRoute(
  pathname: string,
  permissions: string[],
  roles: string[] = [],
  userType?: string | null,
): boolean {
  if (permissions.includes("*")) return true;

  if (isEmAdminRoute(pathname)) {
    if (isEmPortalSubmitterRole(roles, userType)) return false;
    return hasEmAdminPermission(permissions) || isEmCompanyActorType(userType);
  }

  const required = resolveEmRoutePermission(pathname);
  if (!required) return hasAnyEmOperationalPermission(permissions);

  if (permissions.includes(required)) return true;

  if (required === "manage-expense-management-dashboard") {
    return hasAnyEmOperationalPermission(permissions);
  }

  return false;
}
