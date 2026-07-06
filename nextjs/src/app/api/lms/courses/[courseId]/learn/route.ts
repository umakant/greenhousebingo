import { NextRequest, NextResponse } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { loadCourseAccessRow, resolveCourseLearnOutlineAccess } from "@/lib/lms-course-access";
import { serializeSectionForLearner } from "@/lib/lms-course-content-serialize";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string | undefined | null): bigint | null {
  if (raw == null || typeof raw !== "string") return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

/**
 * Published curriculum outline for learners (sanitized lessons).
 * Staff and assigned instructors receive the same shape but may see unpublished lessons.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
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

  const perms = await getPermissionsFromRequest(req);
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

  const publishedOnly = access.role === "student";
  const sections = await prisma.courseSection.findMany({
    where: { courseId, organizationId: actor.organizationId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      lessons: {
        where: publishedOnly ? { isPublished: true } : {},
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
    },
  });

  return NextResponse.json({
    ok: true,
    courseId: courseId.toString(),
    accessRole: access.role,
    sections: sections.map(serializeSectionForLearner),
  });
}
