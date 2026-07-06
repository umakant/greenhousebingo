import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function canManageCourseRoster(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms-instructors") ||
    hasPermission(perms, "manage-lms")
  );
}

async function loadCourseForOrg(courseId: bigint, organizationId: bigint) {
  return prisma.course.findFirst({
    where: { id: courseId, organizationId },
    select: { id: true },
  });
}

async function userIsAssignedInstructor(userId: bigint, courseId: bigint, organizationId: bigint): Promise<boolean> {
  const n = await prisma.courseInstructor.count({
    where: {
      courseId,
      organizationId,
      instructorProfile: { userId },
    },
  });
  return n > 0;
}

/** List instructors linked to a course (one or many). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const { courseId: courseIdStr } = await ctx.params;
  const courseId = parseId(courseIdStr);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const course = await loadCourseForOrg(courseId, actor.organizationId);
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const perms = await getPermissionsFromRequest(req);
  const roster = canManageCourseRoster(perms);
  const instructorView =
    hasPermission(perms, "view-lms-instructor-assignments") ||
    hasPermission(perms, "manage-lms-instructor-courses") ||
    hasPermission(perms, "manage-lms-instructor-dashboard");

  if (!roster && instructorView) {
    const ok = await userIsAssignedInstructor(actor.userId, courseId, actor.organizationId);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }
  } else if (!roster) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const links = await prisma.courseInstructor.findMany({
    where: { courseId, organizationId: actor.organizationId },
    orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
    include: {
      instructorProfile: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    items: links.map((l) => ({
      id: l.id.toString(),
      role: l.role,
      isPrimary: l.isPrimary,
      commissionPercent: l.commissionPercent?.toString() ?? null,
      instructorProfileId: l.instructorProfileId.toString(),
      profile: {
        displayName: l.instructorProfile.displayName,
        headline: l.instructorProfile.headline,
        avatarUrl: l.instructorProfile.avatarUrl,
        user: l.instructorProfile.user
          ? {
              id: l.instructorProfile.user.id.toString(),
              name: l.instructorProfile.user.name,
              email: l.instructorProfile.user.email,
              avatar: l.instructorProfile.user.avatar,
            }
          : null,
      },
    })),
  });
}

/** Assign an instructor profile to a course (supports multiple instructors per course). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageCourseRoster(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { courseId: courseIdStr } = await ctx.params;
  const courseId = parseId(courseIdStr);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const course = await loadCourseForOrg(courseId, actor.organizationId);
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const profileIdStr = typeof body?.instructorProfileId === "string" ? body.instructorProfileId.trim() : "";
  const instructorProfileId = parseId(profileIdStr);
  if (instructorProfileId == null) {
    return NextResponse.json({ ok: false, message: "instructorProfileId is required." }, { status: 400 });
  }

  const profile = await prisma.instructorProfile.findFirst({
    where: { id: instructorProfileId, organizationId: actor.organizationId, isActive: true },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, message: "Instructor profile not found." }, { status: 404 });
  }

  const role = typeof body?.role === "string" ? body.role.trim().slice(0, 64) || null : null;
  const isPrimary = typeof body?.isPrimary === "boolean" ? body.isPrimary : false;
  let commissionPercent: Prisma.Decimal | null | undefined;
  if (body?.commissionPercent !== undefined && body.commissionPercent !== null && body.commissionPercent !== "") {
    const n = Number(body.commissionPercent);
    if (Number.isFinite(n)) {
      commissionPercent = new Prisma.Decimal(Math.min(100, Math.max(0, n)));
    }
  }

  if (isPrimary) {
    await prisma.courseInstructor.updateMany({
      where: { courseId, organizationId: actor.organizationId },
      data: { isPrimary: false },
    });
  }

  await prisma.courseInstructor.upsert({
    where: {
      courseId_instructorProfileId: { courseId, instructorProfileId },
    },
    create: {
      organizationId: actor.organizationId,
      courseId,
      instructorProfileId,
      role,
      isPrimary,
      commissionPercent: commissionPercent ?? undefined,
    },
    update: {
      role,
      isPrimary,
      ...(commissionPercent !== undefined ? { commissionPercent } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

/** Remove an instructor from a course. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageCourseRoster(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { courseId: courseIdStr } = await ctx.params;
  const courseId = parseId(courseIdStr);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const course = await loadCourseForOrg(courseId, actor.organizationId);
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const profileIdStr = url.searchParams.get("instructorProfileId")?.trim() ?? "";
  const instructorProfileId = parseId(profileIdStr);
  if (instructorProfileId == null) {
    return NextResponse.json({ ok: false, message: "instructorProfileId query is required." }, { status: 400 });
  }

  await prisma.courseInstructor.deleteMany({
    where: { courseId, organizationId: actor.organizationId, instructorProfileId },
  });

  return NextResponse.json({ ok: true });
}
