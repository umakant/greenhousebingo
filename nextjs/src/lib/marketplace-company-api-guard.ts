import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { hasPermission } from "@/lib/authz";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { getPermissionsFromRequest, getRolesFromRequest } from "@/lib/read-user-cookies";

export type MarketplaceCompanyContext = {
  userId: bigint;
  organizationId: bigint;
  isSuperadmin: boolean;
  permissions: string[];
};

type GuardResult =
  | { ok: true; ctx: MarketplaceCompanyContext }
  | { ok: false; response: NextResponse };

/**
 * Guard for company buyer marketplace APIs (`/api/marketplace/shop/*`).
 * Requires an authenticated user with the marketplace add-on active and a
 * marketplace permission. Resolves the tenant organization id used to scope rows.
 * Superadmins are allowed through with their own id as the organization context.
 */
export async function guardMarketplaceCompany(
  req: NextRequest,
  requiredPermission = "marketplace.view",
): Promise<GuardResult> {
  const role = req.cookies.get("pf_role")?.value;
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!role || !uidRaw) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };
  }

  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };
  }

  const roles = getRolesFromRequest(req);
  const isSuperadmin = roles.includes("superadmin") || roles.includes("super_admin");

  const perms = await getPermissionsFromRequest(req);
  if (
    !isSuperadmin &&
    !hasPermission(perms, requiredPermission) &&
    !hasPermission(perms, "marketplace.manage")
  ) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }

  const activated = (await getActivatedPackagesForUser(userId, isSuperadmin)).map((p) => p.toLowerCase());
  if (!isSuperadmin && !activated.includes("marketplace")) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }

  const actor = await loadTenantActorUser(userId);
  const organizationId = actor ? resolveTenantOrganizationId(actor) : null;
  if (organizationId == null) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "No organization context" }, { status: 403 }),
    };
  }

  return { ok: true, ctx: { userId, organizationId, isSuperadmin, permissions: perms } };
}
