import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";

export type MarketplaceAdminPageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
};

/**
 * Server gate for `/marketplace/admin/*` — superadmin only, plus a section permission.
 * Mirrors requirePartnershipPage(); superadmin already holds `*` so the permission
 * check is effectively metadata, but it keeps section gating explicit.
 */
export async function requireMarketplaceAdminPage(
  requiredPermission = "marketplace.view",
): Promise<MarketplaceAdminPageUser> {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  if (!hasPermission(permissions, requiredPermission)) {
    redirect("/marketplace/admin");
  }

  return { name, email, roles, permissions, activatedPackages };
}
