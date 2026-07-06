import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { studentJoinLiveSession } from "@/lib/lms-live-session-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

/** Join a live session: validates enrollment, capacity, time window; records attendance; returns meeting URL. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid session id." }, { status: 400 });
  }

  const result = await studentJoinLiveSession({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
    sessionId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message, code: result.code },
      { status: result.httpStatus },
    );
  }

  return NextResponse.json({
    ok: true,
    meetingUrl: result.meetingUrl,
    meetingProvider: result.meetingProvider,
    session: result.session,
    attendanceStatus: result.attendanceStatus,
  });
}
