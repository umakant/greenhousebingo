import { NextRequest, NextResponse } from "next/server";

import { readEventPlatformMaintenanceSettings } from "@/lib/event-platform/event-platform-settings";
import {
  EP_MAINT_BYPASS_COOKIE,
  maintenanceBypassPathMatches,
} from "@/lib/event-platform/maintenance-gate";
import { resolveEventPlatformTenantFromCookies } from "@/lib/event-platform/tenant-context";

export const dynamic = "force-dynamic";

/** Sets bypass cookie when the secret path matches tenant maintenance settings. */
export async function GET(req: NextRequest) {
  const tenant = await resolveEventPlatformTenantFromCookies();
  if (!tenant) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get("path")?.trim() ?? "";
  const settings = await readEventPlatformMaintenanceSettings(tenant.organizationId);
  if (!settings.bypassPath || !maintenanceBypassPathMatches(path, settings.bypassPath)) {
    return NextResponse.json({ ok: false, message: "Invalid bypass path." }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, message: "Maintenance bypass enabled." });
  res.cookies.set(EP_MAINT_BYPASS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
