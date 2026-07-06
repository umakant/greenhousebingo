import { NextRequest, NextResponse } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { buildLiveSessionIcsContent } from "@/lib/lms-live-session-calendar";
import { canManageLmsLiveSessions } from "@/lib/lms-live-session-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

function canAccess(perms: string[]): boolean {
  return (
    canManageLmsLiveSessions(perms) ||
    hasPermission(perms, "view-lms-student-dashboard")
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canAccess(perms)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return new NextResponse("Invalid session id", { status: 400 });
  }

  const session = await prisma.lmsLiveSession.findFirst({
    where: { id: sessionId, organizationId: actor.organizationId },
    include: { course: { select: { title: true } } },
  });
  if (!session) {
    return new NextResponse("Not found", { status: 404 });
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

  const filename = `live-session-${session.id}.ics`;
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
