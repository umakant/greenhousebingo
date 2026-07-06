import type { NextRequest } from "next/server";

import { hasPermission, isSuperAdminSession } from "@/lib/authz";
import { getUserByEmail, settingsOwnerIdForUser } from "@/lib/settings-service";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

/**
 * Superadmin with `manage-users` (company detail billing), or any user whose tenant
 * (`settingsOwnerIdForUser`) matches the company row id.
 */
export async function canAccessCompanyBillingApis(
  req: NextRequest,
  targetCompanyId: bigint,
): Promise<boolean> {
  if (isSuperAdminSession(req)) {
    const perms = await getPermissionsFromRequest(req);
    return hasPermission(perms, "manage-users");
  }
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return false;
  const user = await getUserByEmail(email);
  if (!user) return false;
  const ownerId = settingsOwnerIdForUser(user);
  return ownerId === targetCompanyId;
}
