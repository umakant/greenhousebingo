import "server-only";

import {
  LmsDeliveryType,
  LmsLiveAttendanceStatus,
  LmsLiveMeetingProvider,
  LmsLiveSessionStatus,
  Prisma,
} from "@prisma/client";

import { evaluateActiveEnrollmentContentAccess, loadCourseAccessRow } from "@/lib/lms-course-access";
import { syncLiveSessionToCreatorGoogleCalendar } from "@/lib/lms-google-calendar-sync";
import { serializeLiveAttendance, serializeLiveSession } from "@/lib/lms-live-session-serialize";
import { prisma } from "@/lib/prisma";

const SEAT_STATUSES: LmsLiveAttendanceStatus[] = [
  LmsLiveAttendanceStatus.REGISTERED,
  LmsLiveAttendanceStatus.ATTENDED,
];

/** Minutes before start when learners may join. */
export const LIVE_JOIN_EARLY_MINUTES = 15;

export function parseLiveMeetingProvider(v: unknown): LmsLiveMeetingProvider | null {
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase().replace(/-/g, "_");
  if (u === "ZOOM") return LmsLiveMeetingProvider.ZOOM;
  if (u === "GOOGLE_MEET" || u === "MEET") return LmsLiveMeetingProvider.GOOGLE_MEET;
  if (u === "MICROSOFT_TEAMS" || u === "TEAMS") return LmsLiveMeetingProvider.MICROSOFT_TEAMS;
  if (u === "OTHER") return LmsLiveMeetingProvider.OTHER;
  return null;
}

export function parseSessionStatus(v: unknown): LmsLiveSessionStatus | null {
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase();
  if (u === "SCHEDULED" || u === "COMPLETED" || u === "CANCELLED") return u as LmsLiveSessionStatus;
  return null;
}

export function parseAttendanceStatus(v: unknown): LmsLiveAttendanceStatus | null {
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase();
  if (u === "REGISTERED" || u === "ATTENDED" || u === "ABSENT") return u as LmsLiveAttendanceStatus;
  return null;
}

export async function countSessionSeatsUsed(sessionId: bigint): Promise<number> {
  return prisma.lmsLiveAttendance.count({
    where: { sessionId, status: { in: SEAT_STATUSES } },
  });
}

export async function loadSessionSeatCounts(sessionIds: bigint[]): Promise<Map<string, number>> {
  if (sessionIds.length === 0) return new Map();
  const rows = await prisma.lmsLiveAttendance.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessionIds }, status: { in: SEAT_STATUSES } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.sessionId.toString(), r._count._all]));
}

export function isWithinJoinWindow(startsAt: Date, endsAt: Date, now = new Date()): boolean {
  const early = new Date(startsAt.getTime() - LIVE_JOIN_EARLY_MINUTES * 60_000);
  return now >= early && now <= endsAt;
}

export async function listLiveSessions(params: {
  organizationId: bigint;
  courseId?: bigint;
  from?: Date;
  to?: Date;
  status?: LmsLiveSessionStatus;
  take?: number;
}) {
  const where: Prisma.LmsLiveSessionWhereInput = {
    organizationId: params.organizationId,
    ...(params.courseId != null ? { courseId: params.courseId } : {}),
    ...(params.status != null ? { status: params.status } : {}),
    ...(params.from || params.to
      ? {
          startsAt: {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          },
        }
      : {}),
  };

  const rows = await prisma.lmsLiveSession.findMany({
    where,
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    take: params.take ?? 200,
    include: { course: { select: { id: true, title: true, slug: true } } },
  });

  const seatMap = await loadSessionSeatCounts(rows.map((r) => r.id));
  return rows.map((r) =>
    serializeLiveSession(r, { seatsUsed: seatMap.get(r.id.toString()) ?? 0 }),
  );
}

export async function getLiveSession(organizationId: bigint, sessionId: bigint) {
  const row = await prisma.lmsLiveSession.findFirst({
    where: { id: sessionId, organizationId },
    include: { course: { select: { id: true, title: true, slug: true } } },
  });
  if (!row) return null;
  const seatsUsed = await countSessionSeatsUsed(sessionId);
  return serializeLiveSession(row, { seatsUsed });
}

export async function createLiveSession(params: {
  organizationId: bigint;
  courseId: bigint;
  createdById: bigint;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  meetingProvider?: LmsLiveMeetingProvider;
  meetingUrl?: string | null;
  capacity?: number | null;
  courseLessonId?: bigint | null;
  syncLesson?: boolean;
  sectionId?: bigint | null;
}) {
  if (params.endsAt <= params.startsAt) {
    throw new Error("Session end must be after start.");
  }

  const course = await prisma.course.findFirst({
    where: { id: params.courseId, organizationId: params.organizationId },
    select: { id: true },
  });
  if (!course) throw new Error("Course not found.");

  let lessonId = params.courseLessonId ?? null;
  if (params.syncLesson && lessonId == null) {
    let sectionId = params.sectionId;
    if (sectionId == null) {
      const sec = await prisma.courseSection.findFirst({
        where: { courseId: params.courseId, organizationId: params.organizationId },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      sectionId = sec?.id ?? null;
    }
    if (sectionId != null) {
      const agg = await prisma.courseLesson.aggregate({
        where: { sectionId, courseId: params.courseId },
        _max: { sortOrder: true },
      });
      const lesson = await prisma.courseLesson.create({
        data: {
          organizationId: params.organizationId,
          courseId: params.courseId,
          sectionId,
          title: params.title.slice(0, 512),
          lessonType: LmsDeliveryType.LIVE_CLASS,
          externalLiveUrl: params.meetingUrl?.slice(0, 2048) ?? null,
          liveStartsAt: params.startsAt,
          liveEndsAt: params.endsAt,
          sortOrder: (agg._max.sortOrder ?? -1) + 1,
          isPublished: true,
        },
      });
      lessonId = lesson.id;
    }
  }

  if (lessonId != null) {
    const lesson = await prisma.courseLesson.findFirst({
      where: { id: lessonId, courseId: params.courseId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!lesson) throw new Error("Linked lesson not found on this course.");
  }

  const row = await prisma.lmsLiveSession.create({
    data: {
      organizationId: params.organizationId,
      courseId: params.courseId,
      courseLessonId: lessonId,
      title: params.title.slice(0, 512),
      description: params.description?.slice(0, 10_000) ?? null,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      meetingProvider: params.meetingProvider ?? LmsLiveMeetingProvider.OTHER,
      meetingUrl: params.meetingUrl?.slice(0, 2048) ?? null,
      capacity: params.capacity ?? null,
      createdById: params.createdById,
    },
    include: { course: { select: { id: true, title: true, slug: true } } },
  });

  if (lessonId != null) {
    await prisma.courseLesson.update({
      where: { id: lessonId },
      data: {
        externalLiveUrl: row.meetingUrl,
        liveStartsAt: row.startsAt,
        liveEndsAt: row.endsAt,
        updatedAt: new Date(),
      },
    });
  }

  void syncLiveSessionToCreatorGoogleCalendar(row.id).catch(() => {});

  return serializeLiveSession(row, { seatsUsed: 0 });
}

export async function updateLiveSession(
  organizationId: bigint,
  sessionId: bigint,
  patch: {
    title?: string;
    description?: string | null;
    startsAt?: Date;
    endsAt?: Date;
    meetingProvider?: LmsLiveMeetingProvider;
    meetingUrl?: string | null;
    capacity?: number | null;
    status?: LmsLiveSessionStatus;
    courseLessonId?: bigint | null;
  },
) {
  const existing = await prisma.lmsLiveSession.findFirst({
    where: { id: sessionId, organizationId },
    select: { id: true, courseLessonId: true, startsAt: true, endsAt: true },
  });
  if (!existing) return null;

  const startsAt = patch.startsAt ?? existing.startsAt;
  const endsAt = patch.endsAt ?? existing.endsAt;
  if (endsAt <= startsAt) throw new Error("Session end must be after start.");

  const row = await prisma.lmsLiveSession.update({
    where: { id: sessionId },
    data: {
      ...(patch.title != null ? { title: patch.title.slice(0, 512) } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.startsAt != null ? { startsAt: patch.startsAt } : {}),
      ...(patch.endsAt != null ? { endsAt: patch.endsAt } : {}),
      ...(patch.meetingProvider != null ? { meetingProvider: patch.meetingProvider } : {}),
      ...(patch.meetingUrl !== undefined ? { meetingUrl: patch.meetingUrl?.slice(0, 2048) ?? null } : {}),
      ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
      ...(patch.status != null ? { status: patch.status } : {}),
      ...(patch.courseLessonId !== undefined ? { courseLessonId: patch.courseLessonId } : {}),
      updatedAt: new Date(),
    },
    include: { course: { select: { id: true, title: true, slug: true } } },
  });

  const lessonId = patch.courseLessonId !== undefined ? patch.courseLessonId : existing.courseLessonId;
  if (lessonId != null) {
    await prisma.courseLesson.update({
      where: { id: lessonId },
      data: {
        externalLiveUrl: row.meetingUrl,
        liveStartsAt: row.startsAt,
        liveEndsAt: row.endsAt,
        updatedAt: new Date(),
      },
    });
  }

  void syncLiveSessionToCreatorGoogleCalendar(sessionId).catch(() => {});

  const seatsUsed = await countSessionSeatsUsed(sessionId);
  return serializeLiveSession(row, { seatsUsed });
}

export async function deleteLiveSession(organizationId: bigint, sessionId: bigint) {
  const row = await prisma.lmsLiveSession.findFirst({
    where: { id: sessionId, organizationId },
    select: { id: true },
  });
  if (!row) return false;

  await prisma.lmsLiveSession.update({
    where: { id: sessionId },
    data: { status: LmsLiveSessionStatus.CANCELLED, updatedAt: new Date() },
  });
  void syncLiveSessionToCreatorGoogleCalendar(sessionId).catch(() => {});

  await prisma.lmsLiveSession.delete({ where: { id: sessionId } });
  return true;
}

export async function listSessionAttendance(organizationId: bigint, sessionId: bigint) {
  const session = await prisma.lmsLiveSession.findFirst({
    where: { id: sessionId, organizationId },
    select: { id: true, courseId: true },
  });
  if (!session) return null;

  const rows = await prisma.lmsLiveAttendance.findMany({
    where: { sessionId, organizationId },
    orderBy: [{ status: "asc" }, { id: "asc" }],
    include: {
      enrollment: {
        select: {
          student: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return rows.map(serializeLiveAttendance);
}

/** Seed REGISTERED rows for all active enrollments without an attendance row. */
export async function seedSessionAttendanceRoster(organizationId: bigint, sessionId: bigint) {
  const session = await prisma.lmsLiveSession.findFirst({
    where: { id: sessionId, organizationId },
    select: { id: true, courseId: true, capacity: true },
  });
  if (!session) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId,
      courseId: session.courseId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const existing = await prisma.lmsLiveAttendance.findMany({
    where: { sessionId },
    select: { enrollmentId: true },
  });
  const have = new Set(existing.map((e) => e.enrollmentId.toString()));

  const toCreate = enrollments.filter((e) => !have.has(e.id.toString()));
  if (toCreate.length > 0) {
    const seatsUsed = await countSessionSeatsUsed(sessionId);
    if (session.capacity != null && seatsUsed + toCreate.length > session.capacity) {
      throw new Error(`Roster would exceed session capacity (${session.capacity} seats).`);
    }
    await prisma.lmsLiveAttendance.createMany({
      data: toCreate.map((e) => ({
        organizationId,
        sessionId,
        enrollmentId: e.id,
        status: LmsLiveAttendanceStatus.REGISTERED,
      })),
      skipDuplicates: true,
    });
  }

  return listSessionAttendance(organizationId, sessionId);
}

export async function updateAttendanceStatus(params: {
  organizationId: bigint;
  sessionId: bigint;
  attendanceId: bigint;
  status: LmsLiveAttendanceStatus;
  markedById: bigint;
  notes?: string | null;
}) {
  const session = await prisma.lmsLiveSession.findFirst({
    where: { id: params.sessionId, organizationId: params.organizationId },
    select: { id: true, capacity: true },
  });
  if (!session) return null;

  const existing = await prisma.lmsLiveAttendance.findFirst({
    where: { id: params.attendanceId, sessionId: params.sessionId, organizationId: params.organizationId },
    select: { id: true, status: true },
  });
  if (!existing) return null;

  if (SEAT_STATUSES.includes(params.status) && !SEAT_STATUSES.includes(existing.status)) {
    const seatsUsed = await countSessionSeatsUsed(params.sessionId);
    if (session.capacity != null && seatsUsed >= session.capacity) {
      throw new Error("Session is at capacity.");
    }
  }

  const now = new Date();
  const row = await prisma.lmsLiveAttendance.update({
    where: { id: params.attendanceId },
    data: {
      status: params.status,
      markedAt: now,
      markedById: params.markedById,
      ...(params.status === LmsLiveAttendanceStatus.ATTENDED ? { joinedAt: now } : {}),
      ...(params.notes !== undefined ? { notes: params.notes?.slice(0, 512) ?? null } : {}),
      updatedAt: now,
    },
    include: {
      enrollment: {
        select: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return serializeLiveAttendance(row);
}

export async function studentJoinLiveSession(params: {
  organizationId: bigint;
  studentUserId: bigint;
  sessionId: bigint;
}) {
  const session = await prisma.lmsLiveSession.findFirst({
    where: { id: params.sessionId, organizationId: params.organizationId },
    include: { course: { select: { id: true, title: true, slug: true } } },
  });
  if (!session) {
    return { ok: false as const, code: "not_found", message: "Session not found.", httpStatus: 404 };
  }
  if (session.status === LmsLiveSessionStatus.CANCELLED) {
    return { ok: false as const, code: "cancelled", message: "This session was cancelled.", httpStatus: 403 };
  }
  if (!isWithinJoinWindow(session.startsAt, session.endsAt)) {
    return {
      ok: false as const,
      code: "outside_window",
      message: "Join is available shortly before the session starts until it ends.",
      httpStatus: 403,
    };
  }
  if (!session.meetingUrl?.trim()) {
    return { ok: false as const, code: "no_link", message: "No meeting link has been set for this session.", httpStatus: 404 };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      organizationId: params.organizationId,
      courseId: session.courseId,
      studentUserId: params.studentUserId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      accessStartsAt: true,
      accessEndsAt: true,
      purchaseKind: true,
      storefrontOrderId: true,
      studentSubscriptionId: true,
    },
  });
  if (!enrollment) {
    return { ok: false as const, code: "not_enrolled", message: "You are not enrolled in this course.", httpStatus: 403 };
  }

  const courseAccess = await loadCourseAccessRow(session.courseId, params.organizationId);
  if (!courseAccess) {
    return { ok: false as const, code: "not_found", message: "Course not found.", httpStatus: 404 };
  }

  const access = await evaluateActiveEnrollmentContentAccess({
    organizationId: params.organizationId,
    courseId: session.courseId,
    course: courseAccess,
    enrollment,
  });
  if (!access.ok) {
    return {
      ok: false as const,
      code: access.code ?? "access_denied",
      message: access.message,
      httpStatus: 403,
    };
  }

  let attendance = await prisma.lmsLiveAttendance.findUnique({
    where: {
      sessionId_enrollmentId: { sessionId: params.sessionId, enrollmentId: enrollment.id },
    },
  });

  if (!attendance) {
    const seatsUsed = await countSessionSeatsUsed(params.sessionId);
    if (session.capacity != null && seatsUsed >= session.capacity) {
      return { ok: false as const, code: "session_full", message: "This session is full.", httpStatus: 403 };
    }
    attendance = await prisma.lmsLiveAttendance.create({
      data: {
        organizationId: params.organizationId,
        sessionId: params.sessionId,
        enrollmentId: enrollment.id,
        status: LmsLiveAttendanceStatus.ATTENDED,
        joinedAt: new Date(),
        markedAt: new Date(),
      },
    });
  } else if (attendance.status !== LmsLiveAttendanceStatus.ATTENDED) {
    if (attendance.status === LmsLiveAttendanceStatus.ABSENT) {
      const seatsUsed = await countSessionSeatsUsed(params.sessionId);
      if (session.capacity != null && seatsUsed >= session.capacity) {
        return { ok: false as const, code: "session_full", message: "This session is full.", httpStatus: 403 };
      }
    }
    attendance = await prisma.lmsLiveAttendance.update({
      where: { id: attendance.id },
      data: {
        status: LmsLiveAttendanceStatus.ATTENDED,
        joinedAt: attendance.joinedAt ?? new Date(),
        updatedAt: new Date(),
      },
    });
  }

  return {
    ok: true as const,
    meetingUrl: session.meetingUrl,
    meetingProvider: session.meetingProvider,
    session: serializeLiveSession(session, {
      seatsUsed: await countSessionSeatsUsed(params.sessionId),
    }),
    attendanceStatus: attendance.status,
  };
}

export async function listStudentUpcomingSessions(params: {
  organizationId: bigint;
  studentUserId: bigint;
  daysAhead?: number;
  courseId?: bigint;
}) {
  const days = params.daysAhead ?? 60;
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: params.organizationId,
      studentUserId: params.studentUserId,
      status: "ACTIVE",
      ...(params.courseId != null ? { courseId: params.courseId } : {}),
    },
    select: { id: true, courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);
  if (courseIds.length === 0) return [];

  const rows = await prisma.lmsLiveSession.findMany({
    where: {
      organizationId: params.organizationId,
      courseId: params.courseId != null ? params.courseId : { in: courseIds },
      status: LmsLiveSessionStatus.SCHEDULED,
      endsAt: { gte: now },
      startsAt: { lte: until },
    },
    orderBy: [{ startsAt: "asc" }],
    take: 50,
    include: { course: { select: { id: true, title: true, slug: true } } },
  });

  const seatMap = await loadSessionSeatCounts(rows.map((r) => r.id));
  const enrollmentByCourse = new Map(enrollments.map((e) => [e.courseId.toString(), e.id.toString()]));

  return rows.map((r) => ({
    ...serializeLiveSession(r, { seatsUsed: seatMap.get(r.id.toString()) ?? 0 }),
    enrollmentId: enrollmentByCourse.get(r.courseId.toString()) ?? null,
    canJoin: isWithinJoinWindow(r.startsAt, r.endsAt, now) && Boolean(r.meetingUrl?.trim()),
  }));
}
