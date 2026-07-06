import { NextRequest, NextResponse } from "next/server";

import { canAccessLaunchpad } from "@/lib/launchpad/launchpad-access";
import { computeLaunchpadOverview } from "@/lib/launchpad/launchpad-status-server";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { safeJsonParse } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value?.trim() ?? "";
  const roles = safeJsonParse<string[]>(req.cookies.get("pf_roles")?.value, []);
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uidRaw) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const actor = await loadTenantActorUser(userId);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const permissions = await getPermissionsFromRequest(req);
  if (!canAccessLaunchpad({ role, roles, userType: actor.type, permissions })) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const organizationId = resolveTenantOrganizationId(actor);
  if (organizationId == null) {
    return NextResponse.json({ ok: false, message: "No organization context." }, { status: 400 });
  }

  const userRow = await prisma.user.findFirst({
    where: { id: userId },
    select: { emailVerifiedAt: true, email: true },
  });

  const activatedPackages = safeJsonParse<string[]>(req.cookies.get("pf_activated_packages")?.value, []);
  const sessionEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();

  const overview = await computeLaunchpadOverview({
    organizationId,
    userId,
    permissions,
    activatedPackages,
    userEmail: userRow?.email ?? sessionEmail,
    emailVerified: Boolean(userRow?.emailVerifiedAt),
  });

  return NextResponse.json({ ok: true, overview });
}
