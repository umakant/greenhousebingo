import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { resolveEventPlatformTenantFromCookies } from "@/lib/event-platform/tenant-context";
import { userHasVenueManagementPermission } from "@/lib/venue-management/permissions";

export type VenueManagementApiActor = {
  userId: bigint;
  organizationId: bigint;
  permissions: string[];
  email: string;
};

async function userHasVenueManagementAddon(req: NextRequest): Promise<boolean> {
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim() ?? "";
  if (!uidRaw) return false;
  try {
    const userId = BigInt(uidRaw);
    const role = req.cookies.get("pf_role")?.value?.trim() ?? "";
    const rolesRaw = req.cookies.get("pf_roles")?.value ?? "[]";
    let roles: string[] = [];
    try {
      roles = JSON.parse(rolesRaw) as string[];
    } catch {
      roles = [];
    }
    const isSuper = role === "superadmin" || roles.includes("superadmin") || roles.includes("super_admin");
    const activated = (await getActivatedPackagesForUser(userId, isSuper)).map((p) => p.toLowerCase());
    return activated.includes("venuemanagement") || activated.includes("eventplatform");
  } catch {
    return false;
  }
}

export async function requireVenueManagementApi(
  req: NextRequest,
  permission: string,
): Promise<VenueManagementApiActor | NextResponse> {
  if (!(await userHasVenueManagementAddon(req))) {
    return NextResponse.json({ ok: false, message: "Venue Management add-on is not active." }, { status: 403 });
  }
  const permissions = await getPermissionsFromRequest(req);
  if (!userHasVenueManagementPermission(permissions, permission)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const tenant = await resolveEventPlatformTenantFromCookies();
  if (!tenant) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const email = req.cookies.get("pf_email")?.value?.trim() ?? "";
  return { ...tenant, permissions, email };
}

export function isVenueManagementApiError(v: VenueManagementApiActor | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}
