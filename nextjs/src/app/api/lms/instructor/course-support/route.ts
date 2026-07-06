import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { listLmsCourseSupportTicketsForInstructor } from "@/lib/lms-course-support-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function canViewInstructorSupport(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "view-lms-instructor-assignments") ||
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
  if (!canViewInstructorSupport(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const courseIdRaw = req.nextUrl.searchParams.get("courseId");
  const courseId = courseIdRaw ? parseLmsBigIntId(courseIdRaw) : null;

  const items = await listLmsCourseSupportTicketsForInstructor({
    organizationId: actor.organizationId,
    instructorUserId: actor.userId,
    courseId,
  });

  return NextResponse.json({ ok: true, items });
}
