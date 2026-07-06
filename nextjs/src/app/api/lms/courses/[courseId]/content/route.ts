import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { serializeSection } from "@/lib/lms-course-content-serialize";
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

function canManageCourses(perms: string[]): boolean {
  return perms.includes("*") || hasPermission(perms, "manage-lms-courses") || hasPermission(perms, "manage-lms");
}

function canViewAssignedCourses(perms: string[]): boolean {
  return (
    hasPermission(perms, "manage-lms-instructor-courses") ||
    hasPermission(perms, "view-lms-instructor-assignments") ||
    hasPermission(perms, "manage-lms-instructor-dashboard")
  );
}

async function userIsAssignedInstructor(userId: bigint, courseId: bigint, organizationId: bigint): Promise<boolean> {
  const n = await prisma.courseInstructor.count({
    where: { courseId, organizationId, instructorProfile: { userId } },
  });
  return n > 0;
}

/** Full section → lessons tree for the course curriculum builder. */
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

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const perms = await getPermissionsFromRequest(req);
  const admin = canManageCourses(perms);
  const instructorView = !admin && canViewAssignedCourses(perms);
  if (!admin && !instructorView) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }
  if (!admin) {
    const ok = await userIsAssignedInstructor(actor.userId, courseId, actor.organizationId);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }
  }

  const sections = await prisma.courseSection.findMany({
    where: { courseId, organizationId: actor.organizationId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      lessons: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    },
  });

  return NextResponse.json({
    ok: true,
    courseId: courseId.toString(),
    sections: sections.map(serializeSection),
    canEdit: admin,
  });
}
