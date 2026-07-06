import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { listStudentUpcomingSessions } from "@/lib/lms-live-session-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

/** Upcoming live sessions for courses the learner is actively enrolled in. */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const daysRaw = req.nextUrl.searchParams.get("days");
  const days = daysRaw ? Math.min(365, Math.max(1, Number.parseInt(daysRaw, 10) || 60)) : 60;

  const courseId = parseLmsBigIntId(req.nextUrl.searchParams.get("courseId") ?? undefined);

  const items = await listStudentUpcomingSessions({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
    daysAhead: days,
    courseId: courseId ?? undefined,
  });

  return NextResponse.json({ ok: true, items });
}
