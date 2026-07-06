import "server-only";

import { LmsCourseStatus, LmsEnrollmentPurchaseKind, LmsEnrollmentStatus } from "@prisma/client";

import { canManageLmsCourses } from "@/lib/lms-course-write-context";
import { prisma } from "@/lib/prisma";

export type LmsCourseContentAccessRole = "staff" | "instructor" | "student";

export type LmsCourseContentAccessOk = {
  ok: true;
  role: LmsCourseContentAccessRole;
  /** Present when `role` is `student` and the learner passed all gates. */
  enrollmentId?: bigint;
};

export type LmsCourseContentAccessErr = {
  ok: false;
  code: string;
  message: string;
  httpStatus: number;
};

export type LmsCourseContentAccessResult = LmsCourseContentAccessOk | LmsCourseContentAccessErr;

/** Learner catalog: published/scheduled courses that are public or already enrolled. */
export function courseVisibleInLearnerCatalog(
  course: Pick<LmsCourseAccessCourse, "isPublic" | "status">,
  hasActiveEnrollment: boolean,
): boolean {
  if (!LEARNER_VISIBLE_STATUS.includes(course.status)) return false;
  return course.isPublic || hasActiveEnrollment;
}

export type LmsCourseAccessCourse = {
  id: bigint;
  organizationId: bigint;
  isPublic: boolean;
  status: LmsCourseStatus;
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
  capacity: number | null;
};

export async function userIsCourseInstructor(
  userId: bigint,
  courseId: bigint,
  organizationId: bigint,
): Promise<boolean> {
  const n = await prisma.courseInstructor.count({
    where: { courseId, organizationId, instructorProfile: { userId } },
  });
  return n > 0;
}

function withinAccessWindow(
  now: Date,
  course: Pick<LmsCourseAccessCourse, "accessStartsAt" | "accessEndsAt">,
  enrollment: { accessStartsAt: Date | null; accessEndsAt: Date | null } | null,
): { ok: true } | { ok: false; code: "access_not_started" | "access_expired" } {
  const start = enrollment?.accessStartsAt ?? course.accessStartsAt;
  const end = enrollment?.accessEndsAt ?? course.accessEndsAt;
  if (start && now < start) return { ok: false, code: "access_not_started" };
  if (end && now > end) return { ok: false, code: "access_expired" };
  return { ok: true };
}

async function paidEnrollmentLinkStillValid(params: {
  organizationId: bigint;
  purchaseKind: LmsEnrollmentPurchaseKind | null;
  storefrontOrderId: bigint | null;
  studentSubscriptionId: bigint | null;
}): Promise<boolean> {
  if (params.purchaseKind === LmsEnrollmentPurchaseKind.SUBSCRIPTION) {
    if (params.studentSubscriptionId == null) return false;
    const sub = await prisma.lmsStudentSubscription.findFirst({
      where: { id: params.studentSubscriptionId, organizationId: params.organizationId },
      select: { status: true, currentPeriodEnd: true },
    });
    if (!sub || sub.status !== "ACTIVE") return false;
    return sub.currentPeriodEnd.getTime() > Date.now();
  }
  if (params.purchaseKind !== LmsEnrollmentPurchaseKind.PAID_STOREFRONT) return true;
  if (params.storefrontOrderId == null) return false;
  const ord = await prisma.storefrontOrder.findFirst({
    where: { id: params.storefrontOrderId, organizationId: params.organizationId },
    select: { status: true },
  });
  return ord?.status === "paid";
}

/** When active count exceeds `capacity`, only the earliest enrollments retain a seat. */
async function enrollmentRetainsCapacitySeat(
  enrollmentId: bigint,
  courseId: bigint,
  capacity: number,
): Promise<boolean> {
  const ranked = await prisma.enrollment.findMany({
    where: { courseId, status: LmsEnrollmentStatus.ACTIVE },
    orderBy: [{ enrolledAt: "asc" }, { id: "asc" }],
    select: { id: true },
    take: capacity,
  });
  return ranked.some((r) => r.id === enrollmentId);
}

export const LEARNER_VISIBLE_STATUS: LmsCourseStatus[] = [LmsCourseStatus.PUBLISHED, LmsCourseStatus.SCHEDULED];

/** Active and finished enrollments shown on learner dashboards and content access. */
export const LEARNER_ENROLLMENT_STATUSES: LmsEnrollmentStatus[] = [
  LmsEnrollmentStatus.ACTIVE,
  LmsEnrollmentStatus.COMPLETED,
];

export async function loadCourseAccessRow(courseId: bigint, organizationId: bigint): Promise<LmsCourseAccessCourse | null> {
  return prisma.course.findFirst({
    where: { id: courseId, organizationId },
    select: {
      id: true,
      organizationId: true,
      isPublic: true,
      status: true,
      accessStartsAt: true,
      accessEndsAt: true,
      capacity: true,
    },
  });
}

/**
 * Who may load protected lesson assets (video playback, etc.).
 * Staff and assigned instructors bypass learner rules.
 * Learners need an active enrollment, valid access window, paid order still settled when applicable,
 * and must be within the first `capacity` active seats when capacity is set and oversubscribed.
 */
export async function resolveCourseLessonPlaybackAccess(params: {
  organizationId: bigint;
  userId: bigint;
  courseId: bigint;
  perms: string[];
  course: LmsCourseAccessCourse;
}): Promise<LmsCourseContentAccessResult> {
  const { organizationId, userId, courseId, perms, course } = params;
  if (course.organizationId !== organizationId) {
    return { ok: false, code: "org_mismatch", message: "Forbidden.", httpStatus: 403 };
  }

  if (canManageLmsCourses(perms)) {
    return { ok: true, role: "staff" };
  }

  if (await userIsCourseInstructor(userId, courseId, organizationId)) {
    return { ok: true, role: "instructor" };
  }

  if (!LEARNER_VISIBLE_STATUS.includes(course.status)) {
    return {
      ok: false,
      code: "course_not_available",
      message: "This course is not available for learners yet.",
      httpStatus: 403,
    };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      courseId,
      organizationId,
      studentUserId: userId,
      status: { in: LEARNER_ENROLLMENT_STATUSES },
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
    const code = course.isPublic ? "not_enrolled" : "private_not_enrolled";
    const message = course.isPublic
      ? "You need an active enrollment to view this content."
      : "This private course requires an active enrollment.";
    return { ok: false, code, message, httpStatus: 403 };
  }

  const now = new Date();
  const win = withinAccessWindow(now, course, enrollment);
  if (!win.ok) {
    const message =
      win.code === "access_not_started"
        ? "Your access to this course has not started yet."
        : "Your access to this course has ended.";
    return { ok: false, code: win.code, message, httpStatus: 403 };
  }

  const paidOk = await paidEnrollmentLinkStillValid({
    organizationId,
    purchaseKind: enrollment.purchaseKind,
    storefrontOrderId: enrollment.storefrontOrderId,
    studentSubscriptionId: enrollment.studentSubscriptionId,
  });
  if (!paidOk) {
    const message =
      enrollment.purchaseKind === LmsEnrollmentPurchaseKind.SUBSCRIPTION
        ? "Your subscription for this course is no longer active."
        : "The storefront order for this enrollment is no longer paid.";
    return {
      ok: false,
      code: "purchase_invalid",
      message,
      httpStatus: 403,
    };
  }

  if (course.capacity != null) {
    const activeCount = await prisma.enrollment.count({
      where: { courseId, status: LmsEnrollmentStatus.ACTIVE },
    });
    if (activeCount > course.capacity) {
      const retains = await enrollmentRetainsCapacitySeat(enrollment.id, courseId, course.capacity);
      if (!retains) {
        return {
          ok: false,
          code: "capacity_exceeded",
          message: "This course is over capacity; your seat is not active.",
          httpStatus: 403,
        };
      }
    }
  }

  return { ok: true, role: "student", enrollmentId: enrollment.id };
}

type EnrollmentAccessRow = {
  id: bigint;
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
  purchaseKind: LmsEnrollmentPurchaseKind | null;
  storefrontOrderId: bigint | null;
  studentSubscriptionId: bigint | null;
};

/** Whether an active enrollment may open lesson content (dashboard, learn, playback). */
export async function evaluateActiveEnrollmentContentAccess(params: {
  organizationId: bigint;
  courseId: bigint;
  course: LmsCourseAccessCourse;
  enrollment: EnrollmentAccessRow;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const { organizationId, courseId, course, enrollment } = params;

  if (!LEARNER_VISIBLE_STATUS.includes(course.status)) {
    return {
      ok: false,
      code: "course_not_available",
      message: "This course is not available for learners yet.",
    };
  }

  const now = new Date();
  const win = withinAccessWindow(now, course, enrollment);
  if (!win.ok) {
    return {
      ok: false,
      code: win.code,
      message:
        win.code === "access_not_started"
          ? "Your access to this course has not started yet."
          : "Your access to this course has ended.",
    };
  }

  const paidOk = await paidEnrollmentLinkStillValid({
    organizationId,
    purchaseKind: enrollment.purchaseKind,
    storefrontOrderId: enrollment.storefrontOrderId,
    studentSubscriptionId: enrollment.studentSubscriptionId,
  });
  if (!paidOk) {
    return {
      ok: false,
      code: "purchase_invalid",
      message:
        enrollment.purchaseKind === LmsEnrollmentPurchaseKind.SUBSCRIPTION
          ? "Your subscription for this course is no longer active."
          : "The storefront order for this enrollment is no longer paid.",
    };
  }

  if (course.capacity != null) {
    const activeCount = await prisma.enrollment.count({
      where: { courseId, status: LmsEnrollmentStatus.ACTIVE },
    });
    if (activeCount > course.capacity) {
      const retains = await enrollmentRetainsCapacitySeat(enrollment.id, courseId, course.capacity);
      if (!retains) {
        return {
          ok: false,
          code: "capacity_exceeded",
          message: "This course is over capacity; your seat is not active.",
        };
      }
    }
  }

  return { ok: true };
}

/** Same learner gate as playback, without duplicating DB work when the caller already loaded enrollment. */
export async function resolveCourseLearnOutlineAccess(params: {
  organizationId: bigint;
  userId: bigint;
  courseId: bigint;
  perms: string[];
  course: LmsCourseAccessCourse;
}): Promise<LmsCourseContentAccessResult> {
  return resolveCourseLessonPlaybackAccess(params);
}

/**
 * Student-only lesson gate: full course access rules plus published lesson in this course.
 * Staff and instructors bypass learner enrollment rules.
 */
export async function assertLearnerCourseLessonAccess(params: {
  organizationId: bigint;
  userId: bigint;
  courseId: bigint;
  lessonId: bigint;
  perms: string[];
}): Promise<
  | { ok: true; role: LmsCourseContentAccessRole; enrollmentId: bigint }
  | { ok: true; role: "staff" | "instructor" }
  | LmsCourseContentAccessErr
> {
  const course = await loadCourseAccessRow(params.courseId, params.organizationId);
  if (!course) {
    return { ok: false, code: "not_found", message: "Course not found.", httpStatus: 404 };
  }

  const access = await resolveCourseLessonPlaybackAccess({
    organizationId: params.organizationId,
    userId: params.userId,
    courseId: params.courseId,
    perms: params.perms,
    course,
  });
  if (!access.ok) return access;

  if (access.role !== "student") {
    return { ok: true, role: access.role };
  }

  const lesson = await prisma.courseLesson.findFirst({
    where: {
      id: params.lessonId,
      courseId: params.courseId,
      organizationId: params.organizationId,
      isPublished: true,
    },
    select: { id: true },
  });
  if (!lesson) {
    return { ok: false, code: "lesson_not_found", message: "Lesson not found.", httpStatus: 404 };
  }

  if (access.enrollmentId == null) {
    return {
      ok: false,
      code: "not_enrolled",
      message: "You need an active enrollment to view this content.",
      httpStatus: 403,
    };
  }

  return { ok: true, role: "student", enrollmentId: access.enrollmentId };
}

