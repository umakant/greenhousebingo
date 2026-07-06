import "server-only";

import { LmsCourseRevenueSource, Prisma } from "@prisma/client";

import { syncInstructorCommissionToExpense } from "@/lib/lms-commission-accounting-sync";
import { prisma } from "@/lib/prisma";

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function resolveCommissionPercent(params: {
  profilePercent: Prisma.Decimal | number;
  assignmentPercent: Prisma.Decimal | null | undefined;
}): number {
  if (params.assignmentPercent != null) {
    return clampPercent(Number(params.assignmentPercent));
  }
  return clampPercent(Number(params.profilePercent));
}

type CourseInstructorRow = {
  instructorProfileId: bigint;
  commissionPercent: Prisma.Decimal | null;
  instructorProfile: { commissionPercent: Prisma.Decimal };
};

async function loadCourseInstructorsForCommission(
  organizationId: bigint,
  courseId: bigint,
): Promise<CourseInstructorRow[]> {
  return prisma.courseInstructor.findMany({
    where: { organizationId, courseId },
    select: {
      instructorProfileId: true,
      commissionPercent: true,
      instructorProfile: { select: { commissionPercent: true } },
    },
  });
}

/** Record gross course revenue and split commissions among assigned instructors. */
export async function recordCourseRevenueAndCommissions(params: {
  organizationId: bigint;
  courseId: bigint;
  grossAmount: number;
  currency: string;
  source: LmsCourseRevenueSource;
  storefrontOrderId?: bigint | null;
  enrollmentId?: bigint | null;
  accountingRevenueId?: bigint | null;
  syncToAccounting?: boolean;
}) {
  if (params.grossAmount <= 0) return null;

  const existing = params.storefrontOrderId
    ? await prisma.lmsCourseRevenueRecord.findFirst({
        where: {
          storefrontOrderId: params.storefrontOrderId,
          courseId: params.courseId,
        },
        select: { id: true },
      })
    : null;
  if (existing) return existing;

  const instructors = await loadCourseInstructorsForCommission(params.organizationId, params.courseId);
  if (instructors.length === 0) return null;

  const revenue = await prisma.lmsCourseRevenueRecord.create({
    data: {
      organizationId: params.organizationId,
      courseId: params.courseId,
      source: params.source,
      grossAmount: new Prisma.Decimal(params.grossAmount),
      currency: params.currency.slice(0, 3) || "USD",
      storefrontOrderId: params.storefrontOrderId ?? undefined,
      enrollmentId: params.enrollmentId ?? undefined,
      accountingRevenueId: params.accountingRevenueId ?? undefined,
    },
  });

  const n = instructors.length;
  const gross = params.grossAmount;

  for (const inst of instructors) {
    const pct = resolveCommissionPercent({
      profilePercent: inst.instructorProfile.commissionPercent,
      assignmentPercent: inst.commissionPercent,
    });
    if (pct <= 0) continue;

    const commissionAmount = (gross * (pct / 100)) / n;
    if (commissionAmount <= 0) continue;

    const commission = await prisma.lmsInstructorCommission.create({
      data: {
        organizationId: params.organizationId,
        instructorProfileId: inst.instructorProfileId,
        courseId: params.courseId,
        revenueRecordId: revenue.id,
        commissionPercent: new Prisma.Decimal(pct),
        commissionAmount: new Prisma.Decimal(commissionAmount),
        currency: revenue.currency,
      },
    });

    if (params.syncToAccounting !== false) {
      try {
        await syncInstructorCommissionToExpense({
          commissionId: commission.id,
          organizationId: params.organizationId,
        });
      } catch (e) {
        console.warn("[lms-instructor-commission] accounting sync failed:", e);
      }
    }
  }

  return revenue;
}

/** Attribute paid storefront order lines to linked LMS courses and accrue commissions. */
export async function recordLmsCommissionsForPaidStorefrontOrder(params: {
  orderId: bigint;
  organizationId: bigint;
}) {
  const order = await prisma.storefrontOrder.findFirst({
    where: { id: params.orderId, organizationId: params.organizationId, status: "paid" },
    select: {
      id: true,
      currency: true,
      accountingRevenueId: true,
      lines: { where: { productId: { not: null } } },
    },
  });
  if (!order?.lines.length) return;

  for (const line of order.lines) {
    const pid = line.productId;
    if (pid == null) continue;

    const gross = Number(line.lineTotal);
    if (gross <= 0) continue;

    const courses = await prisma.course.findMany({
      where: { organizationId: params.organizationId, linkedPosProductId: pid },
      select: { id: true },
    });
    if (courses.length === 0) continue;

    const perCourse = gross / courses.length;
    for (const c of courses) {
      try {
        await recordCourseRevenueAndCommissions({
          organizationId: params.organizationId,
          courseId: c.id,
          grossAmount: perCourse,
          currency: order.currency,
          source: LmsCourseRevenueSource.STOREFRONT_ORDER,
          storefrontOrderId: order.id,
          accountingRevenueId: order.accountingRevenueId,
        });
      } catch (e) {
        console.warn("[lms-instructor-commission] course revenue failed:", e);
      }
    }
  }

  const plans = await prisma.lmsSubscriptionPlan.findMany({
    where: {
      organizationId: params.organizationId,
      linkedPosProductId: { in: order.lines.map((l) => l.productId).filter((id): id is bigint => id != null) },
    },
    include: { planCourses: { select: { courseId: true } } },
  });

  for (const plan of plans) {
    const line = order.lines.find((l) => l.productId === plan.linkedPosProductId);
    if (!line || plan.planCourses.length === 0) continue;
    const gross = Number(line.lineTotal);
    const perCourse = gross / plan.planCourses.length;
    for (const pc of plan.planCourses) {
      try {
        await recordCourseRevenueAndCommissions({
          organizationId: params.organizationId,
          courseId: pc.courseId,
          grossAmount: perCourse,
          currency: order.currency,
          source: LmsCourseRevenueSource.SUBSCRIPTION_ORDER,
          storefrontOrderId: order.id,
          accountingRevenueId: order.accountingRevenueId,
        });
      } catch (e) {
        console.warn("[lms-instructor-commission] subscription revenue failed:", e);
      }
    }
  }
}

export async function getLmsCommissionSummary(organizationId: bigint) {
  const [revenueAgg, commissionAgg, byCourse, byInstructor] = await Promise.all([
    prisma.lmsCourseRevenueRecord.aggregate({
      where: { organizationId },
      _sum: { grossAmount: true },
      _count: true,
    }),
    prisma.lmsInstructorCommission.groupBy({
      by: ["status"],
      where: { organizationId },
      _sum: { commissionAmount: true },
      _count: true,
    }),
    prisma.lmsCourseRevenueRecord.groupBy({
      by: ["courseId"],
      where: { organizationId },
      _sum: { grossAmount: true },
      _count: true,
    }),
    prisma.lmsInstructorCommission.groupBy({
      by: ["instructorProfileId"],
      where: { organizationId, status: { not: "PAID" } },
      _sum: { commissionAmount: true },
      _count: true,
    }),
  ]);

  const courseIds = byCourse.map((r) => r.courseId);
  const profileIds = byInstructor.map((r) => r.instructorProfileId);

  const [courses, profiles] = await Promise.all([
    courseIds.length
      ? prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true },
        })
      : [],
    profileIds.length
      ? prisma.instructorProfile.findMany({
          where: { id: { in: profileIds } },
          select: { id: true, displayName: true, commissionPercent: true },
        })
      : [],
  ]);

  const courseMap = new Map(courses.map((c) => [c.id.toString(), c.title]));
  const profileMap = new Map(
    profiles.map((p) => [p.id.toString(), { name: p.displayName, percent: Number(p.commissionPercent) }]),
  );

  return {
    totalGrossRevenue: Number(revenueAgg._sum.grossAmount ?? 0),
    revenueRecordCount: revenueAgg._count,
    commissionsByStatus: commissionAgg.map((r) => ({
      status: r.status,
      total: Number(r._sum.commissionAmount ?? 0),
      count: r._count,
    })),
    topCourses: byCourse
      .sort((a, b) => Number(b._sum.grossAmount ?? 0) - Number(a._sum.grossAmount ?? 0))
      .slice(0, 20)
      .map((r) => ({
      courseId: r.courseId.toString(),
      courseTitle: courseMap.get(r.courseId.toString()) ?? "Course",
      grossRevenue: Number(r._sum.grossAmount ?? 0),
      recordCount: r._count,
    })),
    topInstructorBalances: byInstructor
      .sort((a, b) => Number(b._sum.commissionAmount ?? 0) - Number(a._sum.commissionAmount ?? 0))
      .slice(0, 20)
      .map((r) => ({
      instructorProfileId: r.instructorProfileId.toString(),
      displayName: profileMap.get(r.instructorProfileId.toString())?.name ?? "Instructor",
      defaultPercent: profileMap.get(r.instructorProfileId.toString())?.percent ?? 0,
      unpaidCommission: Number(r._sum.commissionAmount ?? 0),
      accrualCount: r._count,
    })),
  };
}

/** Create a draft payout from accrued commissions for one instructor. */
export async function createInstructorPayoutDraft(params: {
  organizationId: bigint;
  instructorProfileId: bigint;
  commissionIds?: bigint[];
  notes?: string | null;
}) {
  const where: Prisma.LmsInstructorCommissionWhereInput = {
    organizationId: params.organizationId,
    instructorProfileId: params.instructorProfileId,
    status: "ACCRUED",
    payoutId: null,
  };
  if (params.commissionIds?.length) {
    where.id = { in: params.commissionIds };
  }

  const rows = await prisma.lmsInstructorCommission.findMany({
    where,
    select: { id: true, commissionAmount: true, currency: true },
  });
  if (rows.length === 0) throw new Error("No accrued commissions to pay out");

  const total = rows.reduce((s, r) => s + Number(r.commissionAmount), 0);
  const currency = rows[0]?.currency ?? "USD";

  const payout = await prisma.lmsInstructorPayout.create({
    data: {
      organizationId: params.organizationId,
      instructorProfileId: params.instructorProfileId,
      totalAmount: new Prisma.Decimal(total),
      currency,
      status: "DRAFT",
      notes: params.notes?.trim() || null,
    },
  });

  await prisma.lmsInstructorCommission.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { payoutId: payout.id, status: "PAYOUT_PENDING", updatedAt: new Date() },
  });

  return payout;
}

export async function updateInstructorPayoutStatus(params: {
  organizationId: bigint;
  payoutId: bigint;
  status: "SCHEDULED" | "PAID" | "CANCELLED";
  notes?: string | null;
}) {
  const payout = await prisma.lmsInstructorPayout.findFirst({
    where: { id: params.payoutId, organizationId: params.organizationId },
  });
  if (!payout) throw new Error("Payout not found");

  const paidAt = params.status === "PAID" ? new Date() : payout.paidAt;

  await prisma.lmsInstructorPayout.update({
    where: { id: payout.id },
    data: {
      status: params.status,
      paidAt,
      notes: params.notes !== undefined ? params.notes : payout.notes,
      updatedAt: new Date(),
    },
  });

  if (params.status === "PAID") {
    await prisma.lmsInstructorCommission.updateMany({
      where: { payoutId: payout.id },
      data: { status: "PAID", updatedAt: new Date() },
    });
    const { syncInstructorPayoutToExpense } = await import("@/lib/lms-commission-accounting-sync");
    await syncInstructorPayoutToExpense({
      payoutId: payout.id,
      organizationId: params.organizationId,
    }).catch(() => undefined);
  }

  if (params.status === "CANCELLED") {
    await prisma.lmsInstructorCommission.updateMany({
      where: { payoutId: payout.id },
      data: { payoutId: null, status: "ACCRUED", updatedAt: new Date() },
    });
  }

  return payout;
}
