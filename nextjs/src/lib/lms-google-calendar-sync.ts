import "server-only";

import { LmsLiveSessionStatus } from "@prisma/client";

import {
  deleteGoogleCalendarEvent,
  getGoogleCalendarConnection,
  liveSessionToGoogleEvent,
  upsertGoogleCalendarEvent,
} from "@/lib/google-calendar-api";
import { googleCalendarOAuthConfigured } from "@/lib/google-calendar-config";
import { prisma } from "@/lib/prisma";

/** Sync one live session to the creator's Google Calendar (org schedule). */
export async function syncLiveSessionToCreatorGoogleCalendar(sessionId: bigint): Promise<void> {
  if (!googleCalendarOAuthConfigured()) return;

  const session = await prisma.lmsLiveSession.findUnique({
    where: { id: sessionId },
    include: { course: { select: { title: true } } },
  });
  if (!session?.createdById) return;

  const conn = await getGoogleCalendarConnection(session.createdById);
  if (!conn?.syncLiveSessions) return;

  if (session.status === LmsLiveSessionStatus.CANCELLED) {
    if (session.googleCalendarEventId) {
      try {
        await deleteGoogleCalendarEvent(conn, session.googleCalendarEventId);
      } catch {
        /* ignore remote delete failures */
      }
      await prisma.lmsLiveSession.update({
        where: { id: sessionId },
        data: { googleCalendarEventId: null, updatedAt: new Date() },
      });
    }
    return;
  }

  const event = liveSessionToGoogleEvent({
    title: session.title,
    description: session.description,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    meetingUrl: session.meetingUrl,
    courseTitle: session.course?.title ?? null,
    cancelled: false,
  });

  const eventId = await upsertGoogleCalendarEvent(conn, event, session.googleCalendarEventId);
  await prisma.lmsLiveSession.update({
    where: { id: sessionId },
    data: { googleCalendarEventId: eventId, updatedAt: new Date() },
  });
}

/** Push one session to a specific user's personal Google Calendar. */
export async function syncLiveSessionToUserGoogleCalendar(params: {
  userId: bigint;
  sessionId: bigint;
}): Promise<{ ok: true; googleEventId: string } | { ok: false; message: string }> {
  if (!googleCalendarOAuthConfigured()) {
    return { ok: false, message: "Google Calendar is not configured on this server." };
  }

  const conn = await getGoogleCalendarConnection(params.userId);
  if (!conn) {
    return { ok: false, message: "Connect Google Calendar in LMS Classes or your student dashboard first." };
  }

  const session = await prisma.lmsLiveSession.findUnique({
    where: { id: params.sessionId },
    include: { course: { select: { title: true } } },
  });
  if (!session || session.status === LmsLiveSessionStatus.CANCELLED) {
    return { ok: false, message: "Session not found or cancelled." };
  }

  const existing = await prisma.lmsUserCalendarEventLink.findUnique({
    where: { userId_sessionId: { userId: params.userId, sessionId: params.sessionId } },
  });

  const event = liveSessionToGoogleEvent({
    title: session.title,
    description: session.description,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    meetingUrl: session.meetingUrl,
    courseTitle: session.course?.title ?? null,
  });

  const googleEventId = await upsertGoogleCalendarEvent(conn, event, existing?.googleEventId ?? null);

  await prisma.lmsUserCalendarEventLink.upsert({
    where: { userId_sessionId: { userId: params.userId, sessionId: params.sessionId } },
    create: {
      userId: params.userId,
      sessionId: params.sessionId,
      googleEventId,
      googleCalendarId: conn.calendarId,
    },
    update: { googleEventId, googleCalendarId: conn.calendarId, updatedAt: new Date() },
  });

  return { ok: true, googleEventId };
}

/** Sync all upcoming scheduled sessions for courses the user is actively enrolled in. */
export async function syncEnrolledLiveSessionsToUserCalendar(userId: bigint, organizationId: bigint) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentUserId: userId, organizationId, status: "ACTIVE" },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);
  if (courseIds.length === 0) return { synced: 0, failed: 0 };

  const now = new Date();
  const sessions = await prisma.lmsLiveSession.findMany({
    where: {
      organizationId,
      courseId: { in: courseIds },
      status: LmsLiveSessionStatus.SCHEDULED,
      endsAt: { gte: now },
    },
    select: { id: true },
    take: 100,
  });

  let synced = 0;
  let failed = 0;
  for (const s of sessions) {
    const r = await syncLiveSessionToUserGoogleCalendar({ userId, sessionId: s.id });
    if (r.ok) synced++;
    else failed++;
  }
  return { synced, failed };
}

/** Sync all org live sessions (admin) to the connected user's calendar. */
export async function syncOrgLiveSessionsToUserCalendar(userId: bigint, organizationId: bigint) {
  const sessions = await prisma.lmsLiveSession.findMany({
    where: { organizationId, status: LmsLiveSessionStatus.SCHEDULED },
    select: { id: true },
    take: 200,
  });

  let synced = 0;
  let failed = 0;
  for (const s of sessions) {
    const r = await syncLiveSessionToUserGoogleCalendar({ userId, sessionId: s.id });
    if (r.ok) synced++;
    else failed++;
  }
  return { synced, failed };
}
