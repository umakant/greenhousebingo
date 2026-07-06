import type { Prisma } from "@prisma/client";
import { LmsCourseStatus, LmsDeliveryType, LmsEnrollmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { evaluateActiveEnrollmentContentAccess, LEARNER_ENROLLMENT_STATUSES } from "@/lib/lms-course-access";
import { listLessonProgressForEnrollments } from "@/lib/lms-lesson-progress";
import { buildCourseProgressSnapshot } from "@/lib/lms-progress-service";
import { lmsEmployeeLearnerFromRequest, lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardLessonRow = Prisma.CourseLessonGetPayload<{
  select: {
    id: true;
    courseId: true;
    sectionId: true;
    title: true;
    sortOrder: true;
    section: { select: { sortOrder: true } };
  };
}>;

type DashboardSectionRow = Prisma.CourseSectionGetPayload<{
  select: { id: true; courseId: true; title: true; sortOrder: true };
}>;

const VISIBLE_COURSE: LmsCourseStatus[] = [LmsCourseStatus.PUBLISHED, LmsCourseStatus.SCHEDULED];

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

type SectionRow = {
  sectionId: string;
  title: string;
  progressPercent: number;
  isComplete: boolean;
  completedLessonCount: number;
  publishedLessonCount: number;
};

type EnrolledRow = {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  status: string;
  enrolledAt: string;
  progressPercent: number;
  completedLessonCount: number;
  publishedLessonCount: number;
  isComplete: boolean;
  canAccessContent: boolean;
  accessBlockCode: string | null;
  accessBlockMessage: string | null;
  sections: SectionRow[];
};

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!lmsEmployeeLearnerFromRequest(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: actor.organizationId,
      studentUserId: actor.userId,
      status: { in: LEARNER_ENROLLMENT_STATUSES },
      course: { status: { in: VISIBLE_COURSE } },
    },
    orderBy: [{ enrolledAt: "desc" }, { id: "desc" }],
    take: 100,
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          organizationId: true,
          isPublic: true,
          accessStartsAt: true,
          accessEndsAt: true,
          capacity: true,
        },
      },
    },
  });

  const enrollmentIds = enrollments.map((e) => e.id);
  const progressRows = await listLessonProgressForEnrollments(enrollmentIds);
  const progressByEnrollmentId = new Map<string, typeof progressRows>();
  for (const row of progressRows) {
    const k = row.enrollment_id.toString();
    if (!progressByEnrollmentId.has(k)) progressByEnrollmentId.set(k, []);
    progressByEnrollmentId.get(k)!.push(row);
  }

  const courseIds = enrollments.map((e) => e.courseId);
  let lessonsOrdered: DashboardLessonRow[];
  let allSections: DashboardSectionRow[];
  if (courseIds.length === 0) {
    lessonsOrdered = [];
    allSections = [];
  } else {
    const pair = await Promise.all([
      prisma.courseLesson.findMany({
        where: { courseId: { in: courseIds }, isPublished: true },
        select: {
          id: true,
          courseId: true,
          sectionId: true,
          title: true,
          sortOrder: true,
          section: { select: { sortOrder: true } },
        },
      }),
      prisma.courseSection.findMany({
        where: { courseId: { in: courseIds }, organizationId: actor.organizationId },
        select: { id: true, courseId: true, title: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      }),
    ]);
    lessonsOrdered = pair[0];
    allSections = pair[1];
  }

  lessonsOrdered.sort((a, b) => {
    if (a.courseId !== b.courseId) return a.courseId < b.courseId ? -1 : a.courseId > b.courseId ? 1 : 0;
    const sa = a.section?.sortOrder ?? 0;
    const sb = b.section?.sortOrder ?? 0;
    if (sa !== sb) return sa - sb;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id < b.id ? -1 : 1;
  });

  const sectionsByCourse = new Map<string, typeof allSections>();
  for (const s of allSections) {
    const cid = s.courseId.toString();
    if (!sectionsByCourse.has(cid)) sectionsByCourse.set(cid, []);
    sectionsByCourse.get(cid)!.push(s);
  }

  const lessonsByCourse = new Map<string, typeof lessonsOrdered>();
  for (const l of lessonsOrdered) {
    const cid = l.courseId.toString();
    if (!lessonsByCourse.has(cid)) lessonsByCourse.set(cid, []);
    lessonsByCourse.get(cid)!.push(l);
  }

  const lessonTitleById = new Map<string, string>();
  for (const l of lessonsOrdered) {
    lessonTitleById.set(l.id.toString(), l.title);
  }

  const accessByEnrollmentId = new Map<string, Awaited<ReturnType<typeof evaluateActiveEnrollmentContentAccess>>>();
  await Promise.all(
    enrollments.map(async (e) => {
      const access = await evaluateActiveEnrollmentContentAccess({
        organizationId: actor.organizationId,
        courseId: e.courseId,
        course: e.course,
        enrollment: {
          id: e.id,
          accessStartsAt: e.accessStartsAt,
          accessEndsAt: e.accessEndsAt,
          purchaseKind: e.purchaseKind,
          storefrontOrderId: e.storefrontOrderId,
          studentSubscriptionId: e.studentSubscriptionId,
        },
      });
      accessByEnrollmentId.set(e.id.toString(), access);
    }),
  );

  const accessibleEnrollmentIds = new Set(
    enrollments.filter((e) => accessByEnrollmentId.get(e.id.toString())?.ok === true).map((e) => e.id.toString()),
  );

  const enrolledCourses: EnrolledRow[] = enrollments.map((e) => {
    const cid = e.courseId.toString();
    const courseLessons = lessonsOrdered.filter((l) => l.courseId === e.courseId);
    const sectionOrder = new Map((sectionsByCourse.get(cid) ?? []).map((s) => [s.id.toString(), s.sortOrder]));
    const publishedForSnap = courseLessons.map((l) => ({
      id: l.id,
      sectionId: l.sectionId,
      title: l.title,
      sortOrder: l.sortOrder,
      sectionSortOrder: l.section?.sortOrder ?? sectionOrder.get(l.sectionId.toString()) ?? 0,
    }));
    const snap = buildCourseProgressSnapshot({
      enrollmentId: e.id,
      courseId: e.courseId,
      sections: sectionsByCourse.get(cid) ?? [],
      publishedLessons: publishedForSnap,
      progressRows: progressByEnrollmentId.get(e.id.toString()) ?? [],
    });
    const contentAccess = accessByEnrollmentId.get(e.id.toString());
    const canAccessContent = contentAccess?.ok === true;
    return {
      enrollmentId: snap.enrollmentId,
      courseId: snap.courseId,
      title: e.course.title,
      slug: e.course.slug,
      status: e.course.status,
      enrolledAt: e.enrolledAt.toISOString(),
      progressPercent: snap.coursePercent,
      completedLessonCount: snap.completedLessonCount,
      publishedLessonCount: snap.publishedLessonCount,
      isComplete:
        e.status === LmsEnrollmentStatus.COMPLETED ||
        (snap.publishedLessonCount > 0 && snap.completedLessonCount >= snap.publishedLessonCount),
      canAccessContent,
      accessBlockCode: canAccessContent ? null : (contentAccess && !contentAccess.ok ? contentAccess.code : null),
      accessBlockMessage: canAccessContent
        ? null
        : contentAccess && !contentAccess.ok
          ? contentAccess.message
          : null,
      sections: snap.sections.map((s) => ({
        sectionId: s.sectionId,
        title: s.title,
        progressPercent: s.progressPercent,
        isComplete: s.isComplete,
        completedLessonCount: s.completedLessonCount,
        publishedLessonCount: s.publishedLessonCount,
      })),
    };
  });

  let continueLearning: {
    courseId: string;
    courseTitle: string;
    lessonId: string;
    lessonTitle: string;
    href: string;
  } | null = null;

  const allProgress = enrollments.flatMap((e) => {
    const lp = progressByEnrollmentId.get(e.id.toString()) ?? [];
    return lp.map((p) => ({ enrollment: e, progress: p }));
  });
  allProgress.sort((a, b) => b.progress.last_engaged_at.getTime() - a.progress.last_engaged_at.getTime());

  for (const row of allProgress) {
    if (!accessibleEnrollmentIds.has(row.enrollment.id.toString())) continue;
    if (row.progress.completed_at != null) continue;
    const lid = row.progress.lesson_id.toString();
    if (!lessonTitleById.has(lid)) continue;
    continueLearning = {
      courseId: row.enrollment.courseId.toString(),
      courseTitle: row.enrollment.course.title,
      lessonId: lid,
      lessonTitle: lessonTitleById.get(lid) ?? "Lesson",
      href: lmsMyLearningCoursePath({ id: row.enrollment.courseId, slug: row.enrollment.course.slug }),
    };
    break;
  }

  if (!continueLearning) {
    outer: for (const e of enrollments) {
      if (!accessibleEnrollmentIds.has(e.id.toString())) continue;
      const cid = e.courseId.toString();
      const ordered = lessonsByCourse.get(cid) ?? [];
      const lp = progressByEnrollmentId.get(e.id.toString()) ?? [];
      const done = new Set(lp.filter((p) => p.completed_at != null).map((p) => p.lesson_id.toString()));
      for (const l of ordered) {
        const lid = l.id.toString();
        if (done.has(lid)) continue;
        continueLearning = {
          courseId: cid,
          courseTitle: e.course.title,
          lessonId: lid,
          lessonTitle: l.title,
          href: lmsMyLearningCoursePath({ id: e.courseId, slug: e.course.slug }),
        };
        break outer;
      }
    }
  }

  if (!continueLearning && allProgress.length > 0) {
    const row = allProgress.find((r) => accessibleEnrollmentIds.has(r.enrollment.id.toString()));
    if (!row) {
      /* no accessible in-progress */
    } else {
    const lid = row.progress.lesson_id.toString();
    continueLearning = {
      courseId: row.enrollment.courseId.toString(),
      courseTitle: row.enrollment.course.title,
      lessonId: lid,
      lessonTitle: lessonTitleById.get(lid) ?? "Lesson",
      href: lmsMyLearningCoursePath({ id: row.enrollment.courseId, slug: row.enrollment.course.slug }),
    };
    }
  }

  const now = new Date();
  const horizon = addDays(now, 60);
  const upcomingSessions =
    courseIds.length === 0
      ? []
      : await prisma.courseLesson.findMany({
          where: {
            organizationId: actor.organizationId,
            courseId: { in: courseIds },
            lessonType: LmsDeliveryType.LIVE_CLASS,
            isPublished: true,
            liveStartsAt: { gte: now, lte: horizon },
          },
          orderBy: [{ liveStartsAt: "asc" }, { id: "asc" }],
          take: 12,
          include: {
            course: { select: { id: true, title: true, slug: true } },
          },
        });

  const upcoming = upcomingSessions.map((l) => ({
    courseId: l.courseId.toString(),
    courseSlug: l.course.slug,
    courseTitle: l.course.title,
    lessonId: l.id.toString(),
    lessonTitle: l.title,
    liveStartsAt: l.liveStartsAt?.toISOString() ?? null,
    liveEndsAt: l.liveEndsAt?.toISOString() ?? null,
    externalLiveUrl: l.externalLiveUrl,
  }));

  const progressCourses = enrolledCourses.filter((c) => c.canAccessContent);
  const avgProgress =
    progressCourses.length === 0
      ? 0
      : Math.round(progressCourses.reduce((s, c) => s + c.progressPercent, 0) / progressCourses.length);

  const completedCourseCount = enrolledCourses.filter((c) => c.isComplete).length;

  const certificateItems = enrolledCourses
    .filter((c) => c.isComplete)
    .map((c) => {
      const enrollment = enrollments.find((e) => e.courseId.toString() === c.courseId);
      return {
        id: c.courseId,
        courseTitle: `${c.title} Certification`,
        issuedAt: (enrollment?.completedAt ?? enrollment?.enrolledAt ?? new Date()).toISOString(),
      };
    });

  return NextResponse.json({
    ok: true,
    summary: {
      enrolledCourseCount: enrolledCourses.length,
      accessibleCourseCount: progressCourses.length,
      averageProgressPercent: avgProgress,
      completedCourseCount,
    },
    enrolledCourses,
    continueLearning,
    upcomingSessions: upcoming.filter((u) =>
      enrollments.some(
        (e) => e.courseId.toString() === u.courseId && accessibleEnrollmentIds.has(e.id.toString()),
      ),
    ),
    certificates: {
      comingSoon: true,
      items: certificateItems,
      message: "Certificates will appear here after you complete courses.",
      completedCoursesReady: completedCourseCount,
    },
  });
}
