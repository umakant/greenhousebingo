import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

/**
 * Guard for superadmin partnership-management APIs.
 * Returns a NextResponse (403) when the caller is not an authorized superadmin,
 * otherwise returns null so the route can proceed.
 */
export async function guardPartnershipAdmin(req: NextRequest): Promise<NextResponse | null> {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-partnerships")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}
