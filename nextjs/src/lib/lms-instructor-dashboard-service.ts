import "server-only";

import { LmsEnrollmentStatus, LmsLiveSessionStatus } from "@prisma/client";

import { listLmsCourseSupportTicketsForInstructor } from "@/lib/lms-course-support-service";
import { serializeLiveSession } from "@/lib/lms-live-session-serialize";
import { prisma } from "@/lib/prisma";

const OPEN_TICKET_STATUSES = ["open", "in_progress"];

export async function getLmsInstructorDashboard(params: {
  organizationId: bigint;
  userId: bigint;
}) {
  const { organizationId, userId } = params;

  const [profile, actorUser, assignments] = await Promise.all([
    prisma.instructorProfile.findFirst({
      where: { organizationId, userId },
      select: {
        id: true,
        displayName: true,
        headline: true,
        bio: true,
        avatarUrl: true,
      },
    }),
    prisma.user.findFirst({
      where: { id: userId },
      select: { name: true, avatar: true },
    }),
    prisma.courseInstructor.findMany({
      where: {
        organizationId,
        instructorProfile: { userId },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            deliveryType: true,
            _count: {
              select: {
                enrollments: {
                  where: { status: LmsEnrollmentStatus.ACTIVE },
                },
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
      take: 100,
    }),
  ]);

  const courseIds = assignments.map((a) => a.courseId);
  const displayName =
    profile?.displayName?.trim() ||
    actorUser?.name?.trim() ||
    "Instructor";

  const profileComplete = Boolean(
    (profile?.headline?.trim() || profile?.bio?.trim()) &&
      (profile?.avatarUrl?.trim() || actorUser?.avatar?.trim()),
  );

  if (courseIds.length === 0) {
    return {
      summary: {
        assignedCourseCount: 0,
        activeEnrollmentCount: 0,
        openTicketCount: 0,
        upcomingSessionCount: 0,
      },
      profile: {
        displayName,
        headline: profile?.headline ?? null,
        avatarUrl: profile?.avatarUrl ?? actorUser?.avatar ?? null,
        profileComplete,
      },
      courses: [],
      upcomingSessions: [],
      openTickets: [],
    };
  }

  const now = new Date();

  const [activeEnrollmentCount, upcomingSessionCount, sessions, allTickets] = await Promise.all([
      prisma.enrollment.count({
        where: {
          organizationId,
          courseId: { in: courseIds },
          status: LmsEnrollmentStatus.ACTIVE,
        },
      }),
      prisma.lmsLiveSession.count({
        where: {
          organizationId,
          courseId: { in: courseIds },
          status: LmsLiveSessionStatus.SCHEDULED,
          startsAt: { gte: now },
        },
      }),
      prisma.lmsLiveSession.findMany({
        where: {
          organizationId,
          courseId: { in: courseIds },
          status: LmsLiveSessionStatus.SCHEDULED,
          startsAt: { gte: now },
        },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        take: 6,
        include: { course: { select: { id: true, title: true, slug: true } } },
      }),
      listLmsCourseSupportTicketsForInstructor({
        organizationId,
        instructorUserId: userId,
      }),
    ]);

  const openTicketsAll = allTickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status));
  const openTicketCount = openTicketsAll.length;
  const openTickets = openTicketsAll.slice(0, 6);

  return {
    summary: {
      assignedCourseCount: assignments.length,
      activeEnrollmentCount,
      openTicketCount,
      upcomingSessionCount,
    },
    profile: {
      displayName,
      headline: profile?.headline ?? null,
      avatarUrl: profile?.avatarUrl ?? actorUser?.avatar ?? null,
      profileComplete,
    },
    courses: assignments.map((a) => ({
      id: a.course.id.toString(),
      title: a.course.title,
      slug: a.course.slug,
      status: a.course.status,
      deliveryType: a.course.deliveryType,
      role: a.role,
      isPrimary: a.isPrimary,
      activeEnrollmentCount: a.course._count.enrollments,
    })),
    upcomingSessions: sessions.map((s) => {
      const row = serializeLiveSession(s, { seatsUsed: 0 });
      return {
        id: row.id,
        title: row.title,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        meetingUrl: row.meetingUrl,
        meetingProvider: row.meetingProvider,
        course: s.course
          ? { id: s.course.id.toString(), title: s.course.title, slug: s.course.slug }
          : null,
      };
    }),
    openTickets,
  };
}
