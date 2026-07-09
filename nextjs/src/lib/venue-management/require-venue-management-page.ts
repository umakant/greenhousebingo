import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import {
  userHasAnyVenueManagementPermission,
  userHasVenueManagementPermission,
  type VenueManagementPermission,
} from "@/lib/venue-management/permissions";
import { VENUE_MANAGEMENT_PATHS } from "@/lib/venue-management/paths";

export type VenueManagementPageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole?: string;
};

async function loadActivatedPackages(uidRaw: string, roles: string[]): Promise<string[]> {
  let activated = safeJsonParse<string[]>(
    (await cookies()).get("pf_activated_packages")?.value,
    [],
  ).map((p) => String(p).toLowerCase());
  try {
    const id = BigInt(uidRaw);
    const isSuper = roles.includes("superadmin") || roles.includes("super_admin");
    activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
  } catch {
    /* keep cookie */
  }
  return activated;
}

export async function requireVenueManagementPageAccess(
  pathForAudit: string,
  requiredPermission: VenueManagementPermission | string,
): Promise<VenueManagementPageUser> {
  return requireVenueManagementPageAccessAny(pathForAudit, [requiredPermission]);
}

export async function requireVenueManagementPageAccessAny(
  pathForAudit: string,
  requiredPermissions: string[],
): Promise<VenueManagementPageUser> {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const email = store.get("pf_email")?.value ?? "";
  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const primaryRole = store.get("pf_role")?.value?.trim() ?? roles[0] ?? "";
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);

  const uidRaw = store.get("pf_user_id")?.value?.trim() ?? "";
  const activated = uidRaw ? await loadActivatedPackages(uidRaw, roles) : [];

  if (!activated.includes("venuemanagement") && !activated.includes("eventplatform")) {
    redirect("/dashboard");
  }

  const allowed = requiredPermissions.some((p) => userHasVenueManagementPermission(permissions, p));
  if (!allowed) {
    if (userHasVenueManagementPermission(permissions, "manage-venue-management-dashboard")) {
      redirect(VENUE_MANAGEMENT_PATHS.dashboard);
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

export function userMayAccessVenueManagementNav(permissions: string[], required: string): boolean {
  return userHasVenueManagementPermission(permissions, required);
}

export function userMayAccessAnyVenueManagementNav(permissions: string[], required: string[]): boolean {
  return userHasAnyVenueManagementPermission(permissions, required);
}
