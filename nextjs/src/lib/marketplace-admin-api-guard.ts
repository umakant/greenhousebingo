import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

/**
 * Guard for superadmin marketplace operator APIs (`/api/marketplace/admin/*`).
 * Returns a NextResponse (403) when the caller is not an authorized superadmin,
 * otherwise returns null so the route can proceed.
 */
export async function guardMarketplaceAdmin(
  req: NextRequest,
  requiredPermission = "marketplace.view",
): Promise<NextResponse | null> {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, requiredPermission) && !hasPermission(perms, "marketplace.manage")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}
