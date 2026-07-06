import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import {
  assertInstructorOnCourse,
  getLmsCourseSupportTicket,
} from "@/lib/lms-course-support-service";
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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ticketId: string }> },
) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canViewInstructorSupport(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { ticketId: raw } = await ctx.params;
  const ticketId = parseLmsBigIntId(raw);
  if (ticketId == null) {
    return NextResponse.json({ ok: false, message: "Invalid ticket id." }, { status: 400 });
  }

  const ticket = await getLmsCourseSupportTicket({
    organizationId: actor.organizationId,
    ticketId,
  });
  if (!ticket?.lmsCourseId) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  try {
    await assertInstructorOnCourse({
      organizationId: actor.organizationId,
      courseId: BigInt(ticket.lmsCourseId),
      userId: actor.userId,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ ok: true, ticket });
}
