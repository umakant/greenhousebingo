import "server-only";

import { LmsCourseStatus, LmsEnrollmentStatus } from "@prisma/client";

import { LEARNER_ENROLLMENT_STATUSES } from "@/lib/lms-course-access";
import { getCourseReviewSummariesBatch } from "@/lib/lms-course-review-service";
import { listLessonProgressForEnrollments } from "@/lib/lms-lesson-progress";
import { prisma } from "@/lib/prisma";

const VISIBLE: LmsCourseStatus[] = [LmsCourseStatus.PUBLISHED, LmsCourseStatus.SCHEDULED];

export async function loadLmsStudentOrganizationProfile(organizationId: bigint) {
  const [org, courseCount, instructorCount, studentCount] = await Promise.all([
    prisma.user.findFirst({
      where: { id: organizationId },
      select: { id: true, name: true, email: true, avatar: true },
    }),
    prisma.course.count({
      where: { organizationId, status: { in: VISIBLE }, isPublic: true },
    }),
    prisma.instructorProfile.count({ where: { organizationId, isActive: true } }),
    prisma.enrollment.groupBy({
      by: ["studentUserId"],
      where: { organizationId, status: LmsEnrollmentStatus.ACTIVE },
    }),
  ]);

  return {
    id: organizationId.toString(),
    name: org?.name?.trim() || "Organization",
    tagline: org?.email?.trim() || null,
    avatarUrl: org?.avatar?.trim() || null,
    courseCount,
    instructorCount,
    studentCount: studentCount.length,
  };
}

export type LmsStudentPurchaseRow = {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  deliveryType: string;
  enrolledAt: string;
  accessEndsAt: string | null;
  lessonCount: number;
  sectionCount: number;
  totalDurationSeconds: number;
  progressPercent: number;
  isComplete: boolean;
  amountPaid: number | null;
  currency: string;
  averageRating: number | null;
  reviewCount: number;
};

export async function loadLmsStudentPurchases(params: {
  organizationId: bigint;
  studentUserId: bigint;
}) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: params.organizationId,
      studentUserId: params.studentUserId,
      status: { in: LEARNER_ENROLLMENT_STATUSES },
      course: { status: { in: VISIBLE } },
    },
    orderBy: [{ enrolledAt: "desc" }, { id: "desc" }],
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          deliveryType: true,
          salePrice: true,
          saleCurrency: true,
        },
      },
      storefrontOrder: { select: { total: true, currency: true } },
    },
  });

  const courseIds = enrollments.map((e) => e.courseId);
  const enrollmentIds = enrollments.map((e) => e.id);

  const [sectionAgg, lessonAgg, durationAgg, progressRows, reviewSummaries] = await Promise.all([
    courseIds.length
      ? prisma.courseSection.groupBy({
          by: ["courseId"],
          where: { organizationId: params.organizationId, courseId: { in: courseIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    courseIds.length
      ? prisma.courseLesson.groupBy({
          by: ["courseId"],
          where: {
            organizationId: params.organizationId,
            courseId: { in: courseIds },
            isPublished: true,
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    courseIds.length
      ? prisma.courseLesson.groupBy({
          by: ["courseId"],
          where: {
            organizationId: params.organizationId,
            courseId: { in: courseIds },
            isPublished: true,
          },
          _sum: { durationSeconds: true },
        })
      : Promise.resolve([]),
    enrollmentIds.length ? listLessonProgressForEnrollments(enrollmentIds) : Promise.resolve([]),
    getCourseReviewSummariesBatch(params.organizationId, courseIds),
  ]);

  const sectionsByCourse = new Map(sectionAgg.map((r) => [r.courseId.toString(), r._count._all]));
  const lessonsByCourse = new Map(lessonAgg.map((r) => [r.courseId.toString(), r._count._all]));
  const durationByCourse = new Map(
    durationAgg.map((r) => [r.courseId.toString(), r._sum.durationSeconds ?? 0]),
  );
  const progressByEnrollment = new Map<string, typeof progressRows>();
  for (const row of progressRows) {
    const key = row.enrollment_id.toString();
    if (!progressByEnrollment.has(key)) progressByEnrollment.set(key, []);
    progressByEnrollment.get(key)!.push(row);
  }

  const now = new Date();
  let totalDurationSeconds = 0;
  let totalAmount = 0;
  let upcomingCount = 0;

  const items: LmsStudentPurchaseRow[] = enrollments.map((e) => {
    const cid = e.courseId.toString();
    const publishedCount = lessonsByCourse.get(cid) ?? 0;
    const completed = (progressByEnrollment.get(e.id.toString()) ?? []).filter(
      (p) => p.completed_at != null,
    ).length;
    const progressPercent =
      publishedCount > 0 ? Math.min(100, Math.round((completed / publishedCount) * 100)) : 0;
    const isComplete = publishedCount > 0 && completed >= publishedCount;
    const duration = durationByCourse.get(cid) ?? 0;
    totalDurationSeconds += duration;

    let amountPaid: number | null = null;
    let currency = e.course.saleCurrency || "USD";
    if (e.storefrontOrder) {
      amountPaid = Number(e.storefrontOrder.total);
      currency = e.storefrontOrder.currency || currency;
      totalAmount += amountPaid;
    } else if (e.course.salePrice != null && Number(e.course.salePrice) > 0) {
      amountPaid = Number(e.course.salePrice);
      totalAmount += amountPaid;
    }

    if (e.accessEndsAt && e.accessEndsAt > now) upcomingCount += 1;

    const review = reviewSummaries.get(cid) ?? { averageRating: null, approvedCount: 0 };

    return {
      enrollmentId: e.id.toString(),
      courseId: cid,
      title: e.course.title,
      slug: e.course.slug,
      coverImageUrl: e.course.coverImageUrl,
      deliveryType: e.course.deliveryType,
      enrolledAt: e.enrolledAt.toISOString(),
      accessEndsAt: e.accessEndsAt?.toISOString() ?? null,
      lessonCount: publishedCount,
      sectionCount: sectionsByCourse.get(cid) ?? 0,
      totalDurationSeconds: duration,
      progressPercent,
      isComplete,
      amountPaid,
      currency,
      averageRating: review.averageRating,
      reviewCount: review.approvedCount,
    };
  });

  return {
    summary: {
      purchasedCount: items.length,
      totalDurationSeconds,
      upcomingCount,
      totalAmount,
    },
    items,
  };
}
