import "server-only";

import { hasPermission } from "@/lib/authz";
import {
  canManageAllOrganizationExpenses,
  isEmCompanyActorType,
  isEmPortalSubmitterType,
  isEmWorkflowReviewer,
} from "@/lib/em-access";
import { EM_WORKFLOW_PERMISSIONS } from "@/lib/em-expense-workflow";
import type { EmActor } from "@/lib/em-tenant";

/** Accounting customers, HRM employees, and vendors submit their own expense data. */
export function isEmPortalSubmitter(actor: EmActor): boolean {
  return isEmPortalSubmitterType(actor.type);
}

export { canManageAllOrganizationExpenses };

/** Company admins (not portal users) can see all organization expense records. */
export function canViewAllOrganizationExpenses(
  actor: EmActor,
  permissions: string[],
  roles: string[] = [],
): boolean {
  return canManageAllOrganizationExpenses(permissions, roles, actor.type);
}

export function canApproveOrganizationExpenses(
  actor: EmActor,
  permissions: string[],
  roles: string[] = [],
): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(EM_WORKFLOW_PERMISSIONS.APPROVE)) return true;
  const roleNames = roles.map((r) => r.trim().toLowerCase());
  if (roleNames.includes("expense-supervisor")) return true;
  if (isEmPortalSubmitter(actor)) return false;
  if (isEmCompanyActorType(actor.type)) return true;
  return permissions.includes("manage-expense-management");
}

/**
 * Restricts list queries to the submitter's own records unless the user can manage all expenses.
 */
export function applyEmSubmitterListScope<T extends Record<string, unknown>>(
  where: T,
  actor: EmActor,
  permissions: string[],
  roles: string[] = [],
): T {
  if (!isEmPortalSubmitter(actor)) return where;
  if (canViewAllOrganizationExpenses(actor, permissions, roles)) return where;
  return { ...where, createdByUserId: actor.id };
}

function canFilterEmByPortalUser(actor: EmActor, permissions: string[]): boolean {
  if (permissions.includes("*")) return true;
  if (isEmPortalSubmitter(actor)) return false;
  if (isEmCompanyActorType(actor.type)) {
    return (
      canViewAllOrganizationExpenses(actor, permissions) ||
      permissions.includes("manage-expense-reports") ||
      permissions.includes("manage-expense-entries") ||
      permissions.includes("manage-expense-management-dashboard")
    );
  }
  return canViewAllOrganizationExpenses(actor, permissions);
}

/** Optional admin filter when reviewing a linked portal user from HRM. */
export function parseEmCreatedByUserIdFilter(
  raw: string,
  actor: EmActor,
  permissions: string[],
): bigint | null {
  const v = raw.trim();
  if (!v || !/^\d+$/.test(v)) return null;
  if (!canFilterEmByPortalUser(actor, permissions)) return null;
  return BigInt(v);
}

/** Portal submitters may only change records they created unless they have expense admin access. */
export function canAccessEmRecord(
  actor: EmActor,
  permissions: string[],
  createdByUserId: bigint | null,
  roles: string[] = [],
): boolean {
  if (!isEmPortalSubmitter(actor)) return true;
  if (canViewAllOrganizationExpenses(actor, permissions, roles)) return true;
  return createdByUserId != null && createdByUserId === actor.id;
}
