import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { prisma } from "@/lib/prisma";
import {
  getVendorPermissionKeysForUser,
  MARKETPLACE_VENDOR_USER_TYPE,
} from "@/lib/marketplace-vendor-portal-permissions";

export type MarketplaceVendorSession = {
  userId: bigint;
  vendorId: bigint;
  permissions: string[];
};

export async function resolveMarketplaceVendorSession(
  req: NextRequest,
): Promise<MarketplaceVendorSession | null> {
  const userIdRaw = req.cookies.get("pf_user_id")?.value;
  if (!userIdRaw) return null;

  let userId: bigint;
  try {
    userId = BigInt(userIdRaw);
  } catch {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      type: true,
      marketplaceVendorId: true,
      isActive: true,
      isEnableLogin: true,
    },
  });

  if (!user?.marketplaceVendorId) return null;
  if (user.isActive === false || user.isEnableLogin === false) return null;
  if ((user.type ?? "").toLowerCase() !== MARKETPLACE_VENDOR_USER_TYPE) return null;

  const vendor = await prisma.marketplaceVendor.findFirst({
    where: { id: user.marketplaceVendorId, status: "active" },
    select: { id: true },
  });
  if (!vendor) return null;

  const rolePerms = await getPermissionsFromRequest(req);
  const vendorPerms = await getVendorPermissionKeysForUser(user.marketplaceVendorId, user.id);
  const permissions = Array.from(new Set([...rolePerms, ...vendorPerms]));

  return {
    userId: user.id,
    vendorId: user.marketplaceVendorId,
    permissions,
  };
}

export async function guardMarketplaceVendor(
  req: NextRequest,
  requiredPermission?: string,
): Promise<NextResponse | MarketplaceVendorSession> {
  const session = await resolveMarketplaceVendorSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  if (requiredPermission && !hasPermission(session.permissions, requiredPermission)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return session;
}

/** Superadmin marketplace admin OR vendor session with optional vendor permission. */
export async function guardMarketplaceAdminOrVendor(
  req: NextRequest,
  adminPermission: string,
  vendorPermission?: string,
): Promise<NextResponse | { mode: "admin" } | MarketplaceVendorSession> {
  const role = req.cookies.get("pf_role")?.value;
  if (role === "superadmin") {
    const perms = await getPermissionsFromRequest(req);
    if (!hasPermission(perms, adminPermission) && !hasPermission(perms, "marketplace.manage")) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    return { mode: "admin" };
  }

  const vendor = await guardMarketplaceVendor(req, vendorPermission);
  if (vendor instanceof NextResponse) return vendor;
  return vendor;
}

export function requireVendorPermission(
  session: MarketplaceVendorSession,
  permission: string,
): NextResponse | null {
  if (!hasPermission(session.permissions, permission)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** Alias for guardMarketplaceVendor — vendor session + optional permission. */
export const requireVendor = guardMarketplaceVendor;

/** Alias for guardMarketplaceAdmin — superadmin marketplace admin routes. */
export const requireMarketplaceAdmin = guardMarketplaceAdmin;
