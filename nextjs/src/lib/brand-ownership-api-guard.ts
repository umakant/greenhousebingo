import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export async function guardBrandOwnershipAdmin(req: NextRequest): Promise<NextResponse | null> {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-brand-ownership")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}
