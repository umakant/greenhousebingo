import type { NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";

const COMPANY_TENANT_ROLES = new Set(["company", "company_admin", "staff"]);

/** Company / staff users browsing Settings → Subscription Plans or self-service subscribe. */
export function isCompanyTenantRole(role: string | undefined): boolean {
  return COMPANY_TENANT_ROLES.has(String(role ?? "").trim());
}

/** Read-only access to plan + add-on catalog (comparison grid, subscribe UI). */
export function canReadSubscriptionCatalog(role: string | undefined, perms: string[]): boolean {
  if (!role) return false;
  if (role === "superadmin") return true;
  if (perms.includes("*")) return true;
  if (
    hasPermission(perms, "manage-plans") ||
    hasPermission(perms, "view-plans") ||
    hasPermission(perms, "edit-plans")
  ) {
    return true;
  }
  if (hasPermission(perms, "manage-settings") || hasPermission(perms, "edit-settings")) {
    return true;
  }
  return isCompanyTenantRole(role);
}

/** Subscribe / change own tenant plan (not superadmin assigning to another company). */
export function canSubscribeToPlans(role: string | undefined, perms: string[]): boolean {
  return canReadSubscriptionCatalog(role, perms);
}

export function roleFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get("pf_role")?.value;
}
