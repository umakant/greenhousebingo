import { NextRequest, NextResponse } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { loadCourseAccessRow, resolveCourseLearnOutlineAccess } from "@/lib/lms-course-access";
import { loadStudentCourseProgressSnapshot } from "@/lib/lms-progress-service";
import { serializeCourseProgressSnapshot } from "@/lib/lms-progress-serialize";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function parseId(raw: string | undefined | null): bigint | null {
  if (raw == null || typeof raw !== "string") return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

/** Full lesson, section, and course % progress for the signed-in learner. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(request);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const { courseId: raw } = await ctx.params;
  const courseId = parseId(raw);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const course = await loadCourseAccessRow(courseId, actor.organizationId);
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const perms = await getPermissionsFromRequest(request);
  const access = await resolveCourseLearnOutlineAccess({
    organizationId: actor.organizationId,
    userId: actor.userId,
    courseId,
    perms,
    course,
  });
  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message, code: access.code }, { status: access.httpStatus });
  }
  if (access.role !== "student") {
    return NextResponse.json(
      { ok: false, message: "Progress tracking is for enrolled learners only.", code: "forbidden" },
      { status: 403 },
    );
  }

  const snap = await loadStudentCourseProgressSnapshot({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
    courseId,
  });
  if (!snap) {
    return NextResponse.json({ ok: false, message: "No active enrollment for this course." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, progress: serializeCourseProgressSnapshot(snap) });
}
