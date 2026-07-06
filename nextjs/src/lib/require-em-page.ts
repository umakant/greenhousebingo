import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import {
  hasAnyEmOperationalPermission,
  isEmPortalSubmitterRole,
  isEmWorkflowReviewer,
  userMayAccessEmRoute,
} from "@/lib/em-access";
import { decodePermissions } from "@/lib/read-user-cookies";

export type EmPageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole: string;
  userType: string | null;
};

/**
 * Server gate for `/expense-management/*`: add-on enabled + role-based route permission.
 */
export async function requireEmPageAccess(pathForAudit: string): Promise<EmPageUser> {
  const store = await cookies();
  const primaryRole = store.get("pf_role")?.value?.trim() ?? "";
  if (!primaryRole) redirect("/login");

  const email = store.get("pf_email")?.value ?? "";
  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const userType = primaryRole || roles[0] || null;

  const uidRaw = store.get("pf_user_id")?.value?.trim();
  let activated = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []).map((p) =>
    String(p).toLowerCase(),
  );
  if (uidRaw) {
    try {
      const id = BigInt(uidRaw);
      const isSuper = roles.includes("superadmin");
      activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
    } catch {
      /* keep cookie */
    }
  }

  if (!activated.includes("expensemanagement")) {
    redirect("/dashboard");
  }

  if (!userMayAccessEmRoute(pathForAudit, permissions, roles, userType)) {
    if (
      isEmPortalSubmitterRole(roles, userType) &&
      !isEmWorkflowReviewer(permissions, roles, userType) &&
      hasAnyEmOperationalPermission(permissions)
    ) {
      redirect("/expense-management/expenses");
    }
    if (hasAnyEmOperationalPermission(permissions)) {
      redirect("/expense-management");
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
    userType,
  };
}
