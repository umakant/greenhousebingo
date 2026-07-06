import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { getLmsInstructorDashboard } from "@/lib/lms-instructor-dashboard-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function canViewInstructorDashboard(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-instructor-dashboard") ||
    hasPermission(perms, "view-lms-instructor-assignments") ||
    hasPermission(perms, "manage-lms-instructor-courses") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms")
  );
}

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canViewInstructorDashboard(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const dashboard = await getLmsInstructorDashboard({
    organizationId: actor.organizationId,
    userId: actor.userId,
  });

  return NextResponse.json({ ok: true, dashboard });
}
