import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { moderateCourseReview, serializeCourseReview } from "@/lib/lms-course-review-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string; reviewId: string }> },
) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-lms-courses") &&
    !hasPermission(perms, "manage-lms")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { courseId: courseIdStr, reviewId: reviewIdStr } = await ctx.params;
  const courseId = parseLmsBigIntId(courseIdStr);
  const reviewId = parseLmsBigIntId(reviewIdStr);
  if (courseId == null || reviewId == null) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = (await req.json()) as { status?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const status = body.status?.trim().toUpperCase();
  if (status !== "APPROVED" && status !== "REJECTED") {
    return NextResponse.json({ ok: false, message: "status must be APPROVED or REJECTED." }, { status: 400 });
  }

  try {
    const row = await moderateCourseReview({
      organizationId: actor.organizationId,
      courseId,
      reviewId,
      moderatorUserId: actor.userId,
      status,
    });
    return NextResponse.json({ ok: true, review: serializeCourseReview({ ...row, student: null }) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Moderation failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
