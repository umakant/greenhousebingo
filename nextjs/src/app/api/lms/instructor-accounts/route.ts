import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { provisionLmsPortalUser } from "@/lib/lms-provision-portal-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canManageInstructors(perms: string[]): boolean {
  return perms.includes("*") || hasPermission(perms, "manage-lms-instructors") || hasPermission(perms, "manage-lms");
}

/** Create LMS instructor login + instructor profile in one step. */
export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageInstructors(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await provisionLmsPortalUser({
    kind: "instructor",
    organizationId: actor.organizationId,
    firstName: String(body.first_name ?? ""),
    lastName: String(body.last_name ?? ""),
    email: String(body.email ?? ""),
    password: body.password != null ? String(body.password) : undefined,
    sendWelcomeEmail: body.send_welcome_email !== false,
    displayName: body.display_name != null ? String(body.display_name) : undefined,
    headline: body.headline != null ? String(body.headline) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    userId: result.userId.toString(),
    instructorProfileId: result.instructorProfileId?.toString(),
    welcome_email_sent: result.welcomeEmailSent,
    ...(result.welcomeEmailError && { welcome_email_error: result.welcomeEmailError }),
  });
}
