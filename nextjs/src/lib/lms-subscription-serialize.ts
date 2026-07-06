import type { Course, LmsStudentSubscription, LmsSubscriptionPlan, LmsSubscriptionPlanCourse, PosProduct } from "@prisma/client";

export type LmsSubscriptionPlanRow = LmsSubscriptionPlan & {
  planCourses?: (LmsSubscriptionPlanCourse & { course?: Pick<Course, "id" | "title" | "slug" | "status"> })[];
  linkedPosProduct?: Pick<PosProduct, "id" | "name" | "slug" | "price"> | null;
  _count?: { planCourses?: number; subscriptions?: number };
};

export function serializeLmsSubscriptionPlan(row: LmsSubscriptionPlanRow) {
  const courses =
    row.planCourses?.map((pc) => ({
      courseId: pc.courseId.toString(),
      title: pc.course?.title ?? "",
      slug: pc.course?.slug ?? "",
      status: pc.course?.status ?? null,
    })) ?? [];

  const linked = row.linkedPosProduct;
  return {
    id: row.id.toString(),
    name: row.name,
    description: row.description,
    status: row.status,
    freePlan: row.freePlan,
    packagePriceMonthly: row.packagePriceMonthly.toString(),
    packagePriceYearly: row.packagePriceYearly.toString(),
    trial: row.trial,
    trialDays: row.trialDays,
    linkedPosProductId: row.linkedPosProductId?.toString() ?? null,
    linkedProduct: linked
      ? {
          id: linked.id.toString(),
          name: linked.name,
          slug: linked.slug,
          price: linked.price != null ? Number(linked.price) : null,
          shopUrl: linked.slug?.trim()
            ? `/shop/products/${encodeURIComponent(linked.slug.trim())}`
            : null,
        }
      : null,
    courseCount: row._count?.planCourses ?? courses.length,
    courses,
    activeSubscriberCount: row._count?.subscriptions ?? undefined,
  };
}

export type LmsStudentSubscriptionRow = LmsStudentSubscription & {
  plan?: Pick<LmsSubscriptionPlan, "id" | "name">;
};

export function serializeLmsStudentSubscription(row: LmsStudentSubscriptionRow) {
  return {
    id: row.id.toString(),
    planId: row.planId.toString(),
    planName: row.plan?.name ?? null,
    studentUserId: row.studentUserId.toString(),
    status: row.status,
    billingPeriod: row.billingPeriod,
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    storefrontOrderId: row.storefrontOrderId?.toString() ?? null,
    isActive:
      row.status === "ACTIVE" &&
      row.currentPeriodEnd.getTime() > Date.now() &&
      (row.cancelledAt == null || row.currentPeriodEnd.getTime() > Date.now()),
  };
}
