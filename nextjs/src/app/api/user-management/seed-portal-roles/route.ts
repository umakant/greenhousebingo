import { NextRequest, NextResponse } from "next/server";

import {
  ensureAllSystemPortalRoles,
  SYSTEM_PORTAL_ROLE_NAMES,
} from "@/lib/system-portal-roles";
import { getHrmActor, getHrmPerms, checkPerm, forbidden, unauthorized } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/user-management/seed-portal-roles
 * Ensures built-in portal roles (customer, employee, vendor, LMS student/instructor) exist.
 */
export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();

  try {
    await ensureAllSystemPortalRoles();
    return NextResponse.json({
      ok: true,
      message: "System portal roles synced.",
      roles: [...SYSTEM_PORTAL_ROLE_NAMES],
    });
  } catch (e) {
    console.error("[seed-portal-roles]", e);
    return NextResponse.json({ error: "Failed to seed portal roles." }, { status: 500 });
  }
}
