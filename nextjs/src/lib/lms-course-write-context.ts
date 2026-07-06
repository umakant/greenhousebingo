import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import type { LmsTenantActor } from "@/lib/lms-instructor-context";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export function parseLmsBigIntId(raw: string | undefined | null): bigint | null {
  if (raw == null || typeof raw !== "string") return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

export function canManageLmsCourses(perms: string[]): boolean {
  return perms.includes("*") || hasPermission(perms, "manage-lms-courses") || hasPermission(perms, "manage-lms");
}

export type CourseWriteOk = { ok: true; actor: LmsTenantActor; courseId: bigint };
export type CourseWriteErr = { ok: false; response: NextResponse };

/** Authenticated tenant actor with permission to edit course curriculum. */
export async function requireLmsCourseCurriculumWrite(req: NextRequest, courseIdStr: string): Promise<CourseWriteOk | CourseWriteErr> {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!canManageLmsCourses(perms)) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 }) };
  }
  const courseId = parseLmsBigIntId(courseIdStr);
  if (courseId == null) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 }) };
  }
  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!course) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 }) };
  }
  return { ok: true, actor, courseId };
}
