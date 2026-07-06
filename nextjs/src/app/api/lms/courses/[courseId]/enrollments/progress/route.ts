import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseBigIntId } from "@/lib/lms-enrollment-serialize";
import { loadCourseRosterProgress } from "@/lib/lms-progress-service";
import { serializeCourseProgressSnapshot } from "@/lib/lms-progress-serialize";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canViewRosterProgress(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-students") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms-instructors") ||
    hasPermission(perms, "manage-lms")
  );
}

/** Per-enrollment progress for a course roster (lesson, section, course %). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canViewRosterProgress(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { courseId: courseIdStr } = await ctx.params;
  const courseId = parseBigIntId(courseIdStr);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, organizationId: actor.organizationId },
    select: { id: true, studentUserId: true },
    orderBy: [{ enrolledAt: "desc" }, { id: "desc" }],
    take: 500,
  });

  const progressMap = await loadCourseRosterProgress({
    organizationId: actor.organizationId,
    courseId,
    enrollmentIds: enrollments.map((e) => e.id),
  });

  const items = enrollments.map((e) => {
    const snap = progressMap.get(e.id.toString());
    return {
      enrollmentId: e.id.toString(),
      studentUserId: e.studentUserId.toString(),
      progress: snap ? serializeCourseProgressSnapshot(snap) : null,
    };
  });

  return NextResponse.json({ ok: true, items });
}
