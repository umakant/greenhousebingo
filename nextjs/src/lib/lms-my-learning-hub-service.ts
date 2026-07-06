import "server-only";

import type { Prisma } from "@prisma/client";
import { LmsCourseStatus, LmsEnrollmentStatus } from "@prisma/client";

import { evaluateActiveEnrollmentContentAccess, LEARNER_ENROLLMENT_STATUSES } from "@/lib/lms-course-access";
import { listLessonProgressForEnrollments } from "@/lib/lms-lesson-progress";
import { buildCourseProgressSnapshot } from "@/lib/lms-progress-service";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";
import type { MyLearningCourseCard, MyLearningHubPayload, MyLearningTab } from "@/lib/lms-my-learning-hub-types";
import { prisma } from "@/lib/prisma";

const VISIBLE_COURSE: LmsCourseStatus[] = [LmsCourseStatus.PUBLISHED, LmsCourseStatus.SCHEDULED];

export type { MyLearningCourseCard, MyLearningHubPayload, MyLearningTab } from "@/lib/lms-my-learning-hub-types";

type DashboardLessonRow = Prisma.CourseLessonGetPayload<{
  select: {
    id: true;
    courseId: true;
    sectionId: true;
    title: true;
    sortOrder: true;
    durationSeconds: true;
    section: { select: { sortOrder: true } };
  };
}>;

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function classifyStatus(params: {
  isComplete: boolean;
  progressPercent: number;
  accessEndsAt: Date | null;
  now: Date;
}): MyLearningTab {
  const { isComplete, progressPercent, accessEndsAt, now } = params;
  if (isComplete) return "completed";
  if (accessEndsAt && accessEndsAt < now) return "overdue";
  if (progressPercent > 0) return "in_progress";
  return "not_started";
}

function sumDurationMinutes(lessons: { durationSeconds: number | null }[]): number {
  const sec = lessons.reduce((s, l) => s + (l.durationSeconds ?? 0), 0);
  return sec > 0 ? Math.max(1, Math.round(sec / 60)) : 0;
}

export async function buildMyLearningHub(params: {
  organizationId: bigint;
  studentUserId: bigint;
}): Promise<MyLearningHubPayload> {
  const now = new Date();
  const { organizationId, studentUserId } = params;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId,
      studentUserId,
      status: { in: LEARNER_ENROLLMENT_STATUSES },
      course: { status: { in: VISIBLE_COURSE } },
    },
    orderBy: [{ enrolledAt: "desc" }, { id: "desc" }],
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          coverImageUrl: true,
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
  const courseIds = enrollments.map((e) => e.courseId);
  const progressRows = await listLessonProgressForEnrollments(enrollmentIds);
  const progressByEnrollmentId = new Map<string, typeof progressRows>();
  for (const row of progressRows) {
    const k = row.enrollment_id.toString();
    if (!progressByEnrollmentId.has(k)) progressByEnrollmentId.set(k, []);
    progressByEnrollmentId.get(k)!.push(row);
  }

  let lessonsOrdered: DashboardLessonRow[] = [];
  let allSections: Prisma.CourseSectionGetPayload<{ select: { id: true; courseId: true; title: true; sortOrder: true } }>[] =
    [];

  if (courseIds.length > 0) {
    const pair = await Promise.all([
      prisma.courseLesson.findMany({
        where: { courseId: { in: courseIds }, isPublished: true },
        select: {
          id: true,
          courseId: true,
          sectionId: true,
          title: true,
          sortOrder: true,
          durationSeconds: true,
          section: { select: { sortOrder: true } },
        },
      }),
      prisma.courseSection.findMany({
        where: { courseId: { in: courseIds }, organizationId },
        select: { id: true, courseId: true, title: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      }),
    ]);
    lessonsOrdered = pair[0];
    allSections = pair[1];
  }

  const sectionsByCourse = new Map<string, typeof allSections>();
  for (const s of allSections) {
    const cid = s.courseId.toString();
    if (!sectionsByCourse.has(cid)) sectionsByCourse.set(cid, []);
    sectionsByCourse.get(cid)!.push(s);
  }

  const lessonsByCourse = new Map<string, DashboardLessonRow[]>();
  for (const l of lessonsOrdered) {
    const cid = l.courseId.toString();
    if (!lessonsByCourse.has(cid)) lessonsByCourse.set(cid, []);
    lessonsByCourse.get(cid)!.push(l);
  }

  const lessonTitleById = new Map<string, string>();
  for (const l of lessonsOrdered) lessonTitleById.set(l.id.toString(), l.title);

  const accessByEnrollmentId = new Map<string, Awaited<ReturnType<typeof evaluateActiveEnrollmentContentAccess>>>();
  await Promise.all(
    enrollments.map(async (e) => {
      const access = await evaluateActiveEnrollmentContentAccess({
        organizationId,
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

  const enrolledCards: MyLearningCourseCard[] = enrollments.map((e) => {
    const cid = e.courseId.toString();
    const courseLessons = lessonsByCourse.get(cid) ?? [];
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
    const lp = progressByEnrollmentId.get(e.id.toString()) ?? [];
    const lastAccessed = lp.reduce<Date | null>((max, row) => {
      const d = row.last_engaged_at;
      return !max || d > max ? d : max;
    }, null);
    const contentAccess = accessByEnrollmentId.get(e.id.toString());
    const canAccessContent = contentAccess?.ok === true;
    const due = e.accessEndsAt ?? e.course.accessEndsAt;
    const isComplete =
      e.status === LmsEnrollmentStatus.COMPLETED ||
      (snap.publishedLessonCount > 0 && snap.completedLessonCount >= snap.publishedLessonCount);
    const status = classifyStatus({
      isComplete,
      progressPercent: snap.coursePercent,
      accessEndsAt: due,
      now,
    });

    return {
      courseId: cid,
      enrollmentId: e.id.toString(),
      title: e.course.title,
      slug: e.course.slug,
      description: e.course.description,
      coverImageUrl: e.course.coverImageUrl,
      progressPercent: snap.coursePercent,
      isComplete,
      status,
      totalDurationMinutes: sumDurationMinutes(courseLessons),
      lastAccessedAt: lastAccessed?.toISOString() ?? null,
      href: lmsMyLearningCoursePath({ id: e.courseId, slug: e.course.slug }),
      canAccessContent,
      dueDate: due?.toISOString() ?? null,
    };
  });

  const tabs: Record<MyLearningTab, MyLearningCourseCard[]> = {
    in_progress: enrolledCards.filter((c) => c.status === "in_progress"),
    not_started: enrolledCards.filter((c) => c.status === "not_started"),
    completed: enrolledCards.filter((c) => c.status === "completed"),
    overdue: enrolledCards.filter((c) => c.status === "overdue"),
  };

  const enrolledSet = new Set(enrolledCards.map((c) => c.courseId));
  const recommendedRaw = await prisma.course.findMany({
    where: {
      organizationId,
      status: LmsCourseStatus.PUBLISHED,
      isPublic: true,
      id: { notIn: courseIds.length ? courseIds : [-1n] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 8,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      coverImageUrl: true,
    },
  });

  const recommendedLessonRows =
    recommendedRaw.length === 0
      ? []
      : await prisma.courseLesson.findMany({
          where: { courseId: { in: recommendedRaw.map((c) => c.id) }, isPublished: true },
          select: { courseId: true, durationSeconds: true },
        });

  const durationByRecCourse = new Map<string, number>();
  for (const l of recommendedLessonRows) {
    const k = l.courseId.toString();
    durationByRecCourse.set(k, (durationByRecCourse.get(k) ?? 0) + (l.durationSeconds ?? 0));
  }

  const recommended: MyLearningCourseCard[] = recommendedRaw
    .filter((c) => !enrolledSet.has(c.id.toString()))
    .slice(0, 4)
    .map((c) => ({
      courseId: c.id.toString(),
      enrollmentId: null,
      title: c.title,
      slug: c.slug,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      progressPercent: 0,
      isComplete: false,
      status: "not_started" as MyLearningTab,
      totalDurationMinutes: Math.round((durationByRecCourse.get(c.id.toString()) ?? 0) / 60),
      lastAccessedAt: null,
      href: `/lms/courses/${c.id}`,
      canAccessContent: false,
      dueDate: null,
    }));

  const completedCount = tabs.completed.length;
  const enrolledCount = enrolledCards.length;
  const overallProgressPercent =
    enrolledCount === 0 ? 0 : Math.round((completedCount / enrolledCount) * 100);

  let continueLearning: MyLearningHubPayload["continueLearning"] = null;
  const allProgress = enrollments.flatMap((e) => {
    const lp = progressByEnrollmentId.get(e.id.toString()) ?? [];
    return lp.map((p) => ({ enrollment: e, progress: p }));
  });
  allProgress.sort((a, b) => b.progress.last_engaged_at.getTime() - a.progress.last_engaged_at.getTime());

  for (const row of allProgress) {
    const access = accessByEnrollmentId.get(row.enrollment.id.toString());
    if (!access?.ok) continue;
    if (row.progress.completed_at != null) continue;
    const lid = row.progress.lesson_id.toString();
    if (!lessonTitleById.has(lid)) continue;
    continueLearning = {
      courseId: row.enrollment.courseId.toString(),
      courseTitle: row.enrollment.course.title,
      lessonId: lid,
      lessonTitle: lessonTitleById.get(lid) ?? "Lesson",
      href: lmsMyLearningCoursePath({
        id: row.enrollment.courseId,
        slug: row.enrollment.course.slug,
      }),
    };
    break;
  }

  if (!continueLearning) {
    for (const c of tabs.in_progress) {
      continueLearning = {
        courseId: c.courseId,
        courseTitle: c.title,
        lessonId: "",
        lessonTitle: c.title,
        href: c.href,
      };
      break;
    }
  }

  const horizon = addDays(now, 90);
  const deadlines = enrolledCards
    .filter((c) => c.dueDate && !c.isComplete)
    .map((c) => {
      const due = new Date(c.dueDate!);
      return {
        courseId: c.courseId,
        title: c.title,
        dueDate: c.dueDate!,
        daysRemaining: daysBetween(now, due),
        href: c.href,
      };
    })
    .filter((d) => {
      const due = new Date(d.dueDate);
      return due >= now && due <= horizon;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6);

  return {
    summary: {
      enrolledCount,
      completedCount,
      inProgressCount: tabs.in_progress.length,
      overdueCount: tabs.overdue.length,
      notStartedCount: tabs.not_started.length,
      overallProgressPercent,
    },
    continueLearning,
    tabs,
    recommended,
    deadlines,
  };
}
