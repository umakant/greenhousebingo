import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { LEARNER_VISIBLE_STATUS } from "@/lib/lms-course-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import {
  getCourseReviewSummary,
  getStudentReviewForCourse,
  listApprovedCourseReviews,
  listCourseReviewsForModeration,
  serializeCourseReview,
  submitCourseReview,
} from "@/lib/lms-course-review-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canModerate(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms")
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { courseId: courseIdStr } = await ctx.params;
  const courseId = parseLmsBigIntId(courseIdStr);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId: actor.organizationId },
    select: { id: true, status: true, isPublic: true },
  });
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const moderation = req.nextUrl.searchParams.get("moderation") === "1";
  const perms = await getPermissionsFromRequest(req);

  if (moderation) {
    if (!canModerate(perms)) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }
    const rows = await listCourseReviewsForModeration(actor.organizationId, courseId);
    const summary = await getCourseReviewSummary(actor.organizationId, courseId);
    return NextResponse.json({
      ok: true,
      summary,
      items: rows.map((r) => serializeCourseReview(r)),
    });
  }

  if (!LEARNER_VISIBLE_STATUS.includes(course.status)) {
    return NextResponse.json({ ok: false, message: "Course not available." }, { status: 403 });
  }

  const [summary, items, mine] = await Promise.all([
    getCourseReviewSummary(actor.organizationId, courseId),
    listApprovedCourseReviews({ organizationId: actor.organizationId, courseId }),
    getStudentReviewForCourse({
      organizationId: actor.organizationId,
      courseId,
      studentUserId: actor.userId,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    summary,
    items: items.map((r) => serializeCourseReview(r)),
    myReview: mine ? serializeCourseReview({ ...mine, student: null }) : null,
    canSubmit: Boolean(
      await prisma.enrollment.findFirst({
        where: {
          organizationId: actor.organizationId,
          courseId,
          studentUserId: actor.userId,
          status: { in: ["ACTIVE", "COMPLETED"] },
        },
        select: { id: true },
      }),
    ),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { courseId: courseIdStr } = await ctx.params;
  const courseId = parseLmsBigIntId(courseIdStr);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  let body: { rating?: unknown; body?: unknown };
  try {
    body = (await req.json()) as { rating?: unknown; body?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
  const text = typeof body.body === "string" ? body.body : "";

  try {
    const row = await submitCourseReview({
      organizationId: actor.organizationId,
      courseId,
      studentUserId: actor.userId,
      rating,
      body: text,
    });
    return NextResponse.json({
      ok: true,
      review: serializeCourseReview({ ...row, student: null }),
      message: "Review submitted and pending moderation.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not submit review.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
