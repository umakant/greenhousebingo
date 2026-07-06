import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { getLmsAnalyticsSummary } from "@/lib/lms-analytics-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-lms-analytics") &&
    !hasPermission(perms, "manage-lms-courses") &&
    !hasPermission(perms, "manage-lms")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const summary = await getLmsAnalyticsSummary(actor.organizationId);
  return NextResponse.json({ ok: true, summary });
}
