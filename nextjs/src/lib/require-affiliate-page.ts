import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";

export type AffiliatePageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole: string;
};

export function userMayAccessAffiliatePermission(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes("manage-affiliate-business")) return true;
  return permissions.includes(required);
}

/**
 * Server gate for `/affiliate-business/*`: add-on enabled + section permission (or umbrella).
 */
export async function requireAffiliatePageAccess(
  pathForAudit: string,
  requiredPermission: string,
): Promise<AffiliatePageUser> {
  const store = await cookies();
  const primaryRole = store.get("pf_role")?.value?.trim() ?? "";
  if (!primaryRole) redirect("/login");

  const email = store.get("pf_email")?.value ?? "";
  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);

  const uidRaw = store.get("pf_user_id")?.value?.trim();
  let activated = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []).map((p) =>
    String(p).toLowerCase(),
  );
  if (uidRaw) {
    try {
      const id = BigInt(uidRaw);
      const isSuper = roles.includes("superadmin") || roles.includes("super_admin");
      activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
    } catch {
      /* keep cookie */
    }
  }

  if (!activated.includes("affiliatebusiness")) {
    redirect("/dashboard");
  }

  if (!userMayAccessAffiliatePermission(permissions, requiredPermission)) {
    if (userMayAccessAffiliatePermission(permissions, "manage-affiliate-business-dashboard")) {
      redirect("/affiliate-business");
    }
    redirect("/dashboard");
  }

  void pathForAudit;

  return {
    name,
    email,
    roles,
    permissions,
    activatedPackages: activated,
    primaryRole,
  };
}
