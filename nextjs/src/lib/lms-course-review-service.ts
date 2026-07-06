import "server-only";

import { LmsCourseReviewStatus, LmsEnrollmentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export async function getCourseReviewSummariesBatch(organizationId: bigint, courseIds: bigint[]) {
  if (courseIds.length === 0) return new Map<string, { averageRating: number | null; approvedCount: number }>();
  const aggs = await prisma.lmsCourseReview.groupBy({
    by: ["courseId"],
    where: {
      organizationId,
      courseId: { in: courseIds },
      status: LmsCourseReviewStatus.APPROVED,
    },
    _avg: { rating: true },
    _count: true,
  });
  const map = new Map<string, { averageRating: number | null; approvedCount: number }>();
  for (const id of courseIds) {
    map.set(id.toString(), { averageRating: null, approvedCount: 0 });
  }
  for (const row of aggs) {
    map.set(row.courseId.toString(), {
      averageRating: row._avg.rating != null ? Math.round(row._avg.rating * 10) / 10 : null,
      approvedCount: row._count,
    });
  }
  return map;
}

export async function getCourseReviewSummary(organizationId: bigint, courseId: bigint) {
  const agg = await prisma.lmsCourseReview.aggregate({
    where: { organizationId, courseId, status: LmsCourseReviewStatus.APPROVED },
    _avg: { rating: true },
    _count: true,
  });
  const distribution = await prisma.lmsCourseReview.groupBy({
    by: ["rating"],
    where: { organizationId, courseId, status: LmsCourseReviewStatus.APPROVED },
    _count: true,
  });
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distribution) {
    dist[row.rating] = row._count;
  }
  return {
    averageRating: agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : null,
    approvedCount: agg._count,
    distribution: dist,
  };
}

export async function listApprovedCourseReviews(params: {
  organizationId: bigint;
  courseId: bigint;
  take?: number;
}) {
  const rows = await prisma.lmsCourseReview.findMany({
    where: {
      organizationId: params.organizationId,
      courseId: params.courseId,
      status: LmsCourseReviewStatus.APPROVED,
    },
    orderBy: [{ createdAt: "desc" }],
    take: params.take ?? 50,
    include: {
      student: { select: { id: true, name: true, avatar: true } },
    },
  });
  return rows;
}

export async function listCourseReviewsForModeration(organizationId: bigint, courseId: bigint) {
  return prisma.lmsCourseReview.findMany({
    where: { organizationId, courseId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      student: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });
}

export async function getStudentReviewForCourse(params: {
  organizationId: bigint;
  courseId: bigint;
  studentUserId: bigint;
}) {
  return prisma.lmsCourseReview.findUnique({
    where: {
      courseId_studentUserId: { courseId: params.courseId, studentUserId: params.studentUserId },
    },
  });
}

export async function submitCourseReview(params: {
  organizationId: bigint;
  courseId: bigint;
  studentUserId: bigint;
  rating: number;
  body: string;
}) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      organizationId: params.organizationId,
      courseId: params.courseId,
      studentUserId: params.studentUserId,
      status: { in: [LmsEnrollmentStatus.ACTIVE, LmsEnrollmentStatus.COMPLETED] },
    },
    select: { id: true },
  });
  if (!enrollment) {
    throw new Error("You must be enrolled in this course to leave a review.");
  }

  const text = params.body.trim();
  if (text.length < 10) {
    throw new Error("Review must be at least 10 characters.");
  }
  if (text.length > 5000) {
    throw new Error("Review is too long (max 5000 characters).");
  }

  const rating = clampRating(params.rating);

  const existing = await getStudentReviewForCourse(params);
  if (existing) {
    return prisma.lmsCourseReview.update({
      where: { id: existing.id },
      data: {
        rating,
        body: text,
        status: LmsCourseReviewStatus.PENDING,
        moderatedById: null,
        moderatedAt: null,
        updatedAt: new Date(),
      },
    });
  }

  return prisma.lmsCourseReview.create({
    data: {
      organizationId: params.organizationId,
      courseId: params.courseId,
      studentUserId: params.studentUserId,
      enrollmentId: enrollment.id,
      rating,
      body: text,
      status: LmsCourseReviewStatus.PENDING,
    },
  });
}

export async function moderateCourseReview(params: {
  organizationId: bigint;
  courseId: bigint;
  reviewId: bigint;
  moderatorUserId: bigint;
  status: "APPROVED" | "REJECTED";
}) {
  const review = await prisma.lmsCourseReview.findFirst({
    where: { id: params.reviewId, organizationId: params.organizationId, courseId: params.courseId },
  });
  if (!review) throw new Error("Review not found");

  return prisma.lmsCourseReview.update({
    where: { id: review.id },
    data: {
      status:
        params.status === "APPROVED"
          ? LmsCourseReviewStatus.APPROVED
          : LmsCourseReviewStatus.REJECTED,
      moderatedById: params.moderatorUserId,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export function serializeCourseReview(row: {
  id: bigint;
  rating: number;
  body: string;
  status: LmsCourseReviewStatus;
  createdAt: Date;
  updatedAt: Date | null;
  student?: { id: bigint; name: string | null; avatar: string | null; email?: string | null } | null;
}) {
  return {
    id: row.id.toString(),
    rating: row.rating,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    author: row.student
      ? {
          id: row.student.id.toString(),
          name: row.student.name?.trim() || "Learner",
          avatar: row.student.avatar,
          email: row.student.email ?? undefined,
        }
      : null,
  };
}
