import { NextRequest, NextResponse } from "next/server";

import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import {
  syncEnrolledLiveSessionsToUserCalendar,
  syncOrgLiveSessionsToUserCalendar,
} from "@/lib/lms-google-calendar-sync";
import { googleCalendarOAuthConfigured } from "@/lib/google-calendar-config";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function canManageClasses(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-classes") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms")
  );
}

/** POST { mode: "enrolled" | "org" } — push live sessions to the user's Google Calendar. */
export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!googleCalendarOAuthConfigured()) {
    return NextResponse.json({ ok: false, message: "Google Calendar OAuth is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { mode?: string } | null;
  const mode = body?.mode === "org" ? "org" : "enrolled";

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (mode === "org" && !canManageClasses(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const result =
    mode === "org"
      ? await syncOrgLiveSessionsToUserCalendar(actor.userId, actor.organizationId)
      : await syncEnrolledLiveSessionsToUserCalendar(actor.userId, actor.organizationId);

  return NextResponse.json({ ok: true, mode, ...result });
}
