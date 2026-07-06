import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { buildGoogleCalendarAddUrl, buildLiveSessionIcsContent } from "@/lib/lms-live-session-calendar";
import { syncLiveSessionToUserGoogleCalendar } from "@/lib/lms-google-calendar-sync";
import { googleCalendarOAuthConfigured } from "@/lib/google-calendar-config";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Export links + optional Google API sync for an enrolled learner. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid session id." }, { status: 400 });
  }

  const session = await prisma.lmsLiveSession.findFirst({
    where: { id: sessionId, organizationId: actor.organizationId },
    include: { course: { select: { title: true, id: true } } },
  });
  if (!session) {
    return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
  }

  const enrolled = await prisma.enrollment.findFirst({
    where: {
      courseId: session.courseId,
      studentUserId: actor.userId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!enrolled) {
    return NextResponse.json({ ok: false, message: "Not enrolled in this course." }, { status: 403 });
  }

  const calInput = {
    id: session.id.toString(),
    title: session.title,
    description: session.description,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    meetingUrl: session.meetingUrl,
    courseTitle: session.course?.title ?? null,
  };

  const syncGoogle = req.nextUrl.searchParams.get("sync") === "1";
  let googleSync: { ok: boolean; message?: string } | null = null;
  if (syncGoogle && googleCalendarOAuthConfigured()) {
    const r = await syncLiveSessionToUserGoogleCalendar({ userId: actor.userId, sessionId });
    googleSync = r.ok ? { ok: true } : { ok: false, message: r.message };
  }

  return NextResponse.json({
    ok: true,
    googleCalendarUrl: buildGoogleCalendarAddUrl(calInput),
    icsDownloadUrl: `/api/lms/student/live-sessions/${session.id}/calendar.ics`,
    googleSync,
    oauthConfigured: googleCalendarOAuthConfigured(),
  });
}
