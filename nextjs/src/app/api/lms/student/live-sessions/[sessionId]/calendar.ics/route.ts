import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { buildLiveSessionIcsContent } from "@/lib/lms-live-session-calendar";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return new NextResponse("Invalid session id", { status: 400 });
  }

  const session = await prisma.lmsLiveSession.findFirst({
    where: { id: sessionId, organizationId: actor.organizationId },
    include: { course: { select: { title: true, id: true } } },
  });
  if (!session) {
    return new NextResponse("Not found", { status: 404 });
  }

  const enrolled = await prisma.enrollment.findFirst({
    where: { courseId: session.courseId, studentUserId: actor.userId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrolled) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ics = buildLiveSessionIcsContent({
    id: session.id.toString(),
    title: session.title,
    description: session.description,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    meetingUrl: session.meetingUrl,
    courseTitle: session.course?.title ?? null,
  });
  if (!ics) {
    return new NextResponse("Invalid session dates", { status: 400 });
  }

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="live-session-${session.id}.ics"`,
    },
  });
}
