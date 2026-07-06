import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { MARKETPLACE_VENDOR_PORTAL_ROLE_NAME } from "@/lib/marketplace-vendor-portal-permissions";
import {
  getVendorPermissionKeysForUser,
  MARKETPLACE_VENDOR_USER_TYPE,
} from "@/lib/marketplace-vendor-portal-permissions";

export type MarketplaceVendorPageUser = {
  id: string;
  name: string;
  email: string;
  vendorId: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
  primaryRole: string;
  forcePasswordReset: boolean;
};

export async function requireMarketplaceVendorPage(
  requiredPermission = "marketplace.vendor_portal.dashboard.view",
): Promise<MarketplaceVendorPageUser> {
  const store = await cookies();
  const userIdRaw = store.get("pf_user_id")?.value;
  if (!userIdRaw) redirect("/login");

  let userId: bigint;
  try {
    userId = BigInt(userIdRaw);
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      marketplaceVendorId: true,
      forcePasswordReset: true,
      isActive: true,
      isEnableLogin: true,
    },
  });

  if (
    !user ||
    !user.marketplaceVendorId ||
    (user.type ?? "").toLowerCase() !== MARKETPLACE_VENDOR_USER_TYPE ||
    user.isActive === false ||
    user.isEnableLogin === false
  ) {
    redirect("/dashboard");
  }

  const vendorPerms = await getVendorPermissionKeysForUser(user.marketplaceVendorId, user.id);
  const cookiePerms = await decodePermissions(store.get("pf_permissions")?.value);
  const permissions = Array.from(new Set([...cookiePerms, ...vendorPerms]));

  if (!hasPermission(permissions, requiredPermission) && !hasPermission(permissions, "marketplace.manage")) {
    redirect("/marketplace/vendor");
  }

  return {
    id: user.id.toString(),
    name: user.name ?? user.email ?? "Vendor",
    email: user.email ?? "",
    vendorId: user.marketplaceVendorId.toString(),
    roles: [MARKETPLACE_VENDOR_PORTAL_ROLE_NAME],
    permissions,
    activatedPackages: safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []),
    primaryRole: MARKETPLACE_VENDOR_PORTAL_ROLE_NAME,
    forcePasswordReset: user.forcePasswordReset,
  };
}
