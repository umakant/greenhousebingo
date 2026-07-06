import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { decodePermissions } from "@/lib/read-user-cookies";

export type MarketplacePageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole: string;
  organizationId: string | null;
};

function userMayAccessMarketplace(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes("marketplace.manage")) return true;
  return permissions.includes(required);
}

/**
 * Server gate for company `/marketplace/shop/*`: marketplace add-on enabled +
 * section permission (or the `marketplace.manage` umbrella). Resolves the tenant
 * organization id so buyer pages can scope their data.
 */
export async function requireMarketplacePageAccess(
  requiredPermission = "marketplace.view",
): Promise<MarketplacePageUser> {
  const store = await cookies();
  const primaryRole = store.get("pf_role")?.value?.trim() ?? "";
  if (!primaryRole) redirect("/login");

  const email = store.get("pf_email")?.value ?? "";
  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);

  const uidRaw = store.get("pf_user_id")?.value?.trim();
  const isSuper = roles.includes("superadmin") || roles.includes("super_admin");

  let activated = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []).map((p) =>
    String(p).toLowerCase(),
  );
  let organizationId: bigint | null = null;

  if (uidRaw) {
    try {
      const id = BigInt(uidRaw);
      activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
      const actor = await loadTenantActorUser(id);
      organizationId = actor ? resolveTenantOrganizationId(actor) : null;
    } catch {
      /* keep cookie */
    }
  }

  if (!isSuper && !activated.includes("marketplace")) {
    redirect("/dashboard");
  }

  if (!userMayAccessMarketplace(permissions, requiredPermission)) {
    if (userMayAccessMarketplace(permissions, "marketplace.view")) {
      redirect("/marketplace/shop");
    }
    redirect("/dashboard");
  }

  return {
    name,
    email,
    roles,
    permissions,
    activatedPackages: activated,
    primaryRole,
    organizationId: organizationId == null ? null : organizationId.toString(),
  };
}
