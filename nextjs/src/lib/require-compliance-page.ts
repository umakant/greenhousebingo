import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import { canAccessComplianceDashboard, userMayAccessComplianceRoute } from "@/lib/compliance/compliance-access";
import { decodePermissions } from "@/lib/read-user-cookies";

export type CompliancePageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole: string;
};

export async function requireCompliancePageAccess(pathForAudit: string): Promise<CompliancePageUser> {
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
      const isSuper = roles.includes("superadmin") || primaryRole === "superadmin";
      activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
    } catch {
      /* keep cookie */
    }
  }

  const isSuperadmin = roles.includes("superadmin") || primaryRole === "superadmin" || permissions.includes("*");
  if (!isSuperadmin && !activated.includes("compliance")) {
    redirect("/dashboard");
  }

  if (!userMayAccessComplianceRoute(pathForAudit, permissions, primaryRole)) {
    if (canAccessComplianceDashboard(permissions, primaryRole)) {
      redirect("/compliance");
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
  };
}
