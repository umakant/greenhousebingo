import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { resolveEventPlatformTenantFromCookies } from "@/lib/event-platform/tenant-context";
import { userHasEventPlatformPermission } from "@/lib/event-platform/permissions";

export type EventPlatformApiActor = {
  userId: bigint;
  organizationId: bigint;
  permissions: string[];
  email: string;
};

export async function requireEventPlatformApi(
  req: NextRequest,
  permission: string,
): Promise<EventPlatformApiActor | NextResponse> {
  const permissions = await getPermissionsFromRequest(req);
  if (!userHasEventPlatformPermission(permissions, permission)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const tenant = await resolveEventPlatformTenantFromCookies();
  if (!tenant) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const email = req.cookies.get("pf_email")?.value?.trim() ?? "";
  return { ...tenant, permissions, email };
}

export function isEventPlatformApiError(v: EventPlatformApiActor | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}
