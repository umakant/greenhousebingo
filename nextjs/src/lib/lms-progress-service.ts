import "server-only";

import { LmsEnrollmentStatus } from "@prisma/client";

import {
  listLessonProgressForEnrollments,
  recordLessonProgress,
  type LessonProgressAction,
} from "@/lib/lms-lesson-progress";
import {
  buildCourseProgressSnapshot,
  type CourseProgressSnapshot,
  type LessonProgressSummary,
  type LmsLessonProgressInput,
  type SectionProgressSummary,
} from "@/lib/lms-progress-snapshot";
import { prisma } from "@/lib/prisma";

export {
  buildCourseProgressSnapshot,
  type CourseProgressSnapshot,
  type LessonProgressSummary,
  type LmsLessonProgressInput,
  type SectionProgressSummary,
};

async function loadPublishedCurriculum(courseId: bigint, organizationId: bigint) {
  const [sections, publishedLessons] = await Promise.all([
    prisma.courseSection.findMany({
      where: { courseId, organizationId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, title: true, sortOrder: true },
    }),
    prisma.courseLesson.findMany({
      where: { courseId, organizationId, isPublished: true },
      orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        sectionId: true,
        title: true,
        sortOrder: true,
        section: { select: { sortOrder: true } },
      },
    }),
  ]);

  const sectionOrder = new Map(sections.map((s) => [s.id.toString(), s.sortOrder]));
  const publishedWithSectionOrder = publishedLessons.map((l) => ({
    id: l.id,
    sectionId: l.sectionId,
    title: l.title,
    sortOrder: l.sortOrder,
    sectionSortOrder: l.section?.sortOrder ?? sectionOrder.get(l.sectionId.toString()) ?? 0,
  }));

  return { sections, publishedWithSectionOrder };
}

function buildSnapshotForEnrollment(params: {
  enrollmentId: bigint;
  courseId: bigint;
  sections: Awaited<ReturnType<typeof loadPublishedCurriculum>>["sections"];
  publishedLessons: Awaited<ReturnType<typeof loadPublishedCurriculum>>["publishedWithSectionOrder"];
  progressRows: Awaited<ReturnType<typeof listLessonProgressForEnrollments>>;
}): CourseProgressSnapshot {
  return buildCourseProgressSnapshot({
    enrollmentId: params.enrollmentId,
    courseId: params.courseId,
    sections: params.sections,
    publishedLessons: params.publishedLessons,
    progressRows: params.progressRows,
  });
}

/** When all published lessons are complete, mark enrollment COMPLETED; otherwise keep ACTIVE. */
export async function syncEnrollmentStatusFromProgress(params: {
  enrollmentId: bigint;
  snap: CourseProgressSnapshot;
}) {
  const allDone =
    params.snap.publishedLessonCount > 0 &&
    params.snap.completedLessonCount >= params.snap.publishedLessonCount;

  await prisma.enrollment.update({
    where: { id: params.enrollmentId },
    data: {
      status: allDone ? LmsEnrollmentStatus.COMPLETED : LmsEnrollmentStatus.ACTIVE,
      completedAt: allDone ? new Date() : null,
    },
  });
}

/** Load progress for the current student in one course (active enrollment). */
export async function loadStudentCourseProgressSnapshot(params: {
  organizationId: bigint;
  studentUserId: bigint;
  courseId: bigint;
}): Promise<CourseProgressSnapshot | null> {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentUserId: params.studentUserId,
      courseId: params.courseId,
      status: { in: [LmsEnrollmentStatus.ACTIVE, LmsEnrollmentStatus.COMPLETED] },
    },
    select: { id: true },
  });
  if (!enrollment) return null;

  return loadEnrollmentProgressSnapshot({
    organizationId: params.organizationId,
    enrollmentId: enrollment.id,
    courseId: params.courseId,
  });
}

/** Progress for one enrollment (admin or learner). */
export async function loadEnrollmentProgressSnapshot(params: {
  organizationId: bigint;
  enrollmentId: bigint;
  courseId: bigint;
}): Promise<CourseProgressSnapshot> {
  const { sections, publishedWithSectionOrder } = await loadPublishedCurriculum(
    params.courseId,
    params.organizationId,
  );
  const progressRows = await listLessonProgressForEnrollments([params.enrollmentId]);
  return buildSnapshotForEnrollment({
    enrollmentId: params.enrollmentId,
    courseId: params.courseId,
    sections,
    publishedLessons: publishedWithSectionOrder,
    progressRows,
  });
}

/** Progress summaries for all enrollments in a course (roster / admin). */
export async function loadCourseRosterProgress(params: {
  organizationId: bigint;
  courseId: bigint;
  enrollmentIds: bigint[];
}): Promise<Map<string, CourseProgressSnapshot>> {
  const out = new Map<string, CourseProgressSnapshot>();
  if (params.enrollmentIds.length === 0) return out;

  const { sections, publishedWithSectionOrder } = await loadPublishedCurriculum(
    params.courseId,
    params.organizationId,
  );
  const allProgress = await listLessonProgressForEnrollments(params.enrollmentIds);
  const byEnrollment = new Map<string, typeof allProgress>();
  for (const row of allProgress) {
    const k = row.enrollment_id.toString();
    if (!byEnrollment.has(k)) byEnrollment.set(k, []);
    byEnrollment.get(k)!.push(row);
  }

  for (const eid of params.enrollmentIds) {
    const key = eid.toString();
    const snap = buildSnapshotForEnrollment({
      enrollmentId: eid,
      courseId: params.courseId,
      sections,
      publishedLessons: publishedWithSectionOrder,
      progressRows: byEnrollment.get(key) ?? [],
    });
    out.set(key, snap);
  }

  return out;
}

/** Record lesson action for a student and return updated course progress snapshot. */
export async function recordStudentLessonProgress(params: {
  organizationId: bigint;
  studentUserId: bigint;
  courseId: bigint;
  lessonId: bigint;
  action: LessonProgressAction;
}): Promise<CourseProgressSnapshot | null> {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentUserId: params.studentUserId,
      courseId: params.courseId,
      status: { in: [LmsEnrollmentStatus.ACTIVE, LmsEnrollmentStatus.COMPLETED] },
    },
    select: { id: true },
  });
  if (!enrollment) return null;

  await recordLessonProgress({
    organizationId: params.organizationId,
    enrollmentId: enrollment.id,
    lessonId: params.lessonId,
    action: params.action,
  });

  const snap = await loadEnrollmentProgressSnapshot({
    organizationId: params.organizationId,
    enrollmentId: enrollment.id,
    courseId: params.courseId,
  });

  await syncEnrollmentStatusFromProgress({ enrollmentId: enrollment.id, snap });

  if (params.action === "complete") {
    const { notifyLmsLessonCompleted } = await import("@/lib/lms-notification-service");
    void notifyLmsLessonCompleted({
      organizationId: params.organizationId,
      studentUserId: params.studentUserId,
      courseId: params.courseId,
      lessonId: params.lessonId,
      enrollmentId: enrollment.id,
    }).catch(() => undefined);
  }

  return snap;
}
