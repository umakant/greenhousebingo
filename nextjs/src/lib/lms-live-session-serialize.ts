import type {
  LmsLiveAttendance,
  LmsLiveAttendanceStatus,
  LmsLiveMeetingProvider,
  LmsLiveSession,
  LmsLiveSessionStatus,
} from "@prisma/client";

export type SerializedLiveSession = {
  id: string;
  courseId: string;
  courseLessonId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  meetingProvider: LmsLiveMeetingProvider;
  meetingUrl: string | null;
  capacity: number | null;
  status: LmsLiveSessionStatus;
  seatsUsed: number;
  seatsRemaining: number | null;
  createdAt: string;
  course?: { id: string; title: string; slug: string };
};

export type SerializedLiveAttendance = {
  id: string;
  sessionId: string;
  enrollmentId: string;
  status: LmsLiveAttendanceStatus;
  joinedAt: string | null;
  markedAt: string | null;
  notes: string | null;
  student: { id: string; name: string | null; email: string | null };
};

export function serializeLiveSession(
  row: LmsLiveSession & { course?: { id: bigint; title: string; slug: string } | null },
  counts: { seatsUsed: number },
): SerializedLiveSession {
  const cap = row.capacity;
  return {
    id: row.id.toString(),
    courseId: row.courseId.toString(),
    courseLessonId: row.courseLessonId?.toString() ?? null,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    meetingProvider: row.meetingProvider,
    meetingUrl: row.meetingUrl,
    capacity: cap,
    status: row.status,
    seatsUsed: counts.seatsUsed,
    seatsRemaining: cap == null ? null : Math.max(0, cap - counts.seatsUsed),
    createdAt: row.createdAt.toISOString(),
    course: row.course
      ? { id: row.course.id.toString(), title: row.course.title, slug: row.course.slug }
      : undefined,
  };
}

export function serializeLiveAttendance(
  row: LmsLiveAttendance & {
    enrollment: { student: { id: bigint; name: string | null; email: string | null } };
  },
): SerializedLiveAttendance {
  return {
    id: row.id.toString(),
    sessionId: row.sessionId.toString(),
    enrollmentId: row.enrollmentId.toString(),
    status: row.status,
    joinedAt: row.joinedAt?.toISOString() ?? null,
    markedAt: row.markedAt?.toISOString() ?? null,
    notes: row.notes,
    student: {
      id: row.enrollment.student.id.toString(),
      name: row.enrollment.student.name,
      email: row.enrollment.student.email,
    },
  };
}
