import "server-only";

import { LmsEnrollmentStatus, Prisma } from "@prisma/client";

import { assertLearnerCourseLessonAccess } from "@/lib/lms-course-access";
import { prisma } from "@/lib/prisma";

export type LessonProgressAction = "engage" | "complete" | "uncomplete";

/**
 * Persist per-enrollment lesson progress in `lms_lesson_progress`.
 * One row per (enrollment, lesson); completion is stored in `completed_at`.
 */
export async function recordLessonProgress(params: {
  organizationId: bigint;
  enrollmentId: bigint;
  lessonId: bigint;
  action: LessonProgressAction;
}) {
  const now = new Date();
  if (params.action === "uncomplete") {
    await prisma.$executeRaw`
      INSERT INTO "lms_lesson_progress" ("organization_id","enrollment_id","lesson_id","last_engaged_at","completed_at","created_at")
      VALUES (${params.organizationId}, ${params.enrollmentId}, ${params.lessonId}, ${now}, NULL, ${now})
      ON CONFLICT ("enrollment_id","lesson_id") DO UPDATE SET
        "last_engaged_at" = ${now},
        "completed_at" = NULL,
        "updated_at" = ${now}
    `;
    return;
  }

  const markComplete = params.action === "complete";
  await prisma.$executeRaw`
    INSERT INTO "lms_lesson_progress" ("organization_id","enrollment_id","lesson_id","last_engaged_at","completed_at","created_at")
    VALUES (${params.organizationId}, ${params.enrollmentId}, ${params.lessonId}, ${now}, ${markComplete ? now : null}, ${now})
    ON CONFLICT ("enrollment_id","lesson_id") DO UPDATE SET
      "last_engaged_at" = ${now},
      "completed_at" = CASE WHEN ${markComplete} THEN COALESCE("lms_lesson_progress"."completed_at", ${now}) ELSE "lms_lesson_progress"."completed_at" END,
      "updated_at" = ${now}
  `;
}

/** @deprecated Use recordLessonProgress */
export async function upsertLessonEngagement(params: {
  organizationId: bigint;
  enrollmentId: bigint;
  lessonId: bigint;
  markComplete?: boolean;
}) {
  await recordLessonProgress({
    organizationId: params.organizationId,
    enrollmentId: params.enrollmentId,
    lessonId: params.lessonId,
    action: params.markComplete ? "complete" : "engage",
  });
}

export type LessonProgressRow = {
  enrollment_id: bigint;
  lesson_id: bigint;
  completed_at: Date | null;
  last_engaged_at: Date;
};

export async function listLessonProgressForEnrollments(enrollmentIds: bigint[]): Promise<LessonProgressRow[]> {
  if (enrollmentIds.length === 0) return [];
  return prisma.$queryRaw<LessonProgressRow[]>`
    SELECT "enrollment_id", "lesson_id", "completed_at", "last_engaged_at"
    FROM "lms_lesson_progress"
    WHERE "enrollment_id" IN (${Prisma.join(enrollmentIds)})
  `;
}

/**
 * Learner lesson progress: requires full course access and a published lesson.
 */
export async function assertEnrollmentLessonForStudent(params: {
  organizationId: bigint;
  studentUserId: bigint;
  courseId: bigint;
  lessonId: bigint;
  perms: string[];
}) {
  const gate = await assertLearnerCourseLessonAccess({
    organizationId: params.organizationId,
    userId: params.studentUserId,
    courseId: params.courseId,
    lessonId: params.lessonId,
    perms: params.perms,
  });

  if (!gate.ok) {
    const reason =
      gate.code === "lesson_not_found"
        ? "lesson_not_found"
        : gate.code === "not_found"
          ? "course_not_found"
          : "access_denied";
    return {
      ok: false as const,
      reason,
      code: gate.code,
      message: gate.message,
      httpStatus: gate.httpStatus,
    };
  }

  if (gate.role !== "student") {
    return {
      ok: false as const,
      reason: "staff_only" as const,
      code: "forbidden",
      message: "Lesson progress is for enrolled learners only.",
      httpStatus: 403,
    };
  }

  return { ok: true as const, enrollmentId: gate.enrollmentId };
}
