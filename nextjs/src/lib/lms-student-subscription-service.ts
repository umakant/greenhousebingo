import "server-only";

import {
  LmsEnrollmentPurchaseKind,
  LmsStudentSubscriptionStatus,
  LmsSubscriptionBillingPeriod,
  Prisma,
} from "@prisma/client";

import { upsertActiveEnrollment } from "@/lib/lms-enrollment-service";
import { prisma } from "@/lib/prisma";

export type LmsBillingPeriodInput = "monthly" | "yearly";

function toBillingPeriod(p: LmsBillingPeriodInput): LmsSubscriptionBillingPeriod {
  return p === "yearly" ? LmsSubscriptionBillingPeriod.YEARLY : LmsSubscriptionBillingPeriod.MONTHLY;
}

function addPeriodEnd(start: Date, period: LmsSubscriptionBillingPeriod, trialDays: number): Date {
  const end = new Date(start);
  if (trialDays > 0) {
    end.setDate(end.getDate() + trialDays);
    return end;
  }
  if (period === LmsSubscriptionBillingPeriod.YEARLY) {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export function isStudentSubscriptionCurrentlyValid(sub: {
  status: LmsStudentSubscriptionStatus;
  currentPeriodEnd: Date;
}): boolean {
  if (sub.status !== LmsStudentSubscriptionStatus.ACTIVE) return false;
  return sub.currentPeriodEnd.getTime() > Date.now();
}

/** Whether the learner has an active subscription covering this course. */
export async function learnerHasActiveSubscriptionForCourse(params: {
  organizationId: bigint;
  studentUserId: bigint;
  courseId: bigint;
}): Promise<{ ok: true; subscriptionId: bigint } | { ok: false }> {
  const row = await prisma.lmsStudentSubscription.findFirst({
    where: {
      organizationId: params.organizationId,
      studentUserId: params.studentUserId,
      status: LmsStudentSubscriptionStatus.ACTIVE,
      currentPeriodEnd: { gt: new Date() },
      plan: { planCourses: { some: { courseId: params.courseId } } },
    },
    select: { id: true, currentPeriodEnd: true, status: true },
    orderBy: { currentPeriodEnd: "desc" },
  });
  if (!row || !isStudentSubscriptionCurrentlyValid(row)) return { ok: false };
  return { ok: true, subscriptionId: row.id };
}

async function provisionEnrollmentsForSubscription(params: {
  organizationId: bigint;
  planId: bigint;
  studentUserId: bigint;
  studentSubscriptionId: bigint;
  periodEnd: Date;
  storefrontOrderId?: bigint | null;
  crmCustomerId?: bigint | null;
}) {
  const links = await prisma.lmsSubscriptionPlanCourse.findMany({
    where: { planId: params.planId, organizationId: params.organizationId },
    select: { courseId: true },
  });

  for (const { courseId } of links) {
    try {
      await upsertActiveEnrollment({
        organizationId: params.organizationId,
        courseId,
        studentUserId: params.studentUserId,
        purchaseKind: LmsEnrollmentPurchaseKind.SUBSCRIPTION,
        accessEndsAt: params.periodEnd,
        storefrontOrderId: params.storefrontOrderId ?? undefined,
        crmCustomerId: params.crmCustomerId ?? undefined,
        studentSubscriptionId: params.studentSubscriptionId,
      });
    } catch (e) {
      console.warn("[lms-student-subscription] provision enrollment failed:", e);
    }
  }
}

/**
 * Subscribe a learner to a plan (free assigns immediately; paid via storefront uses order id).
 * Mirrors SaaS `/api/plans/[id]/subscribe` for LMS catalog plans.
 */
export async function subscribeStudentToLmsPlan(params: {
  organizationId: bigint;
  planId: bigint;
  studentUserId: bigint;
  billingPeriod: LmsBillingPeriodInput;
  storefrontOrderId?: bigint | null;
  crmCustomerId?: bigint | null;
}) {
  const plan = await prisma.lmsSubscriptionPlan.findFirst({
    where: { id: params.planId, organizationId: params.organizationId, status: true },
    include: { planCourses: { select: { courseId: true } } },
  });
  if (!plan) throw new Error("Subscription plan not found");
  if (plan.planCourses.length === 0) throw new Error("Plan has no bundled courses");

  const period = toBillingPeriod(params.billingPeriod);
  const now = new Date();
  const periodEnd = addPeriodEnd(now, period, plan.trial && plan.trialDays > 0 ? plan.trialDays : 0);

  if (!plan.freePlan && plan.linkedPosProductId != null && params.storefrontOrderId == null) {
    throw new Error("This plan requires storefront checkout");
  }

  const existing = await prisma.lmsStudentSubscription.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      studentUserId: params.studentUserId,
      status: LmsStudentSubscriptionStatus.ACTIVE,
      currentPeriodEnd: { gt: now },
    },
    select: { id: true },
  });

  let subscriptionId: bigint;
  if (existing) {
    const updated = await prisma.lmsStudentSubscription.update({
      where: { id: existing.id },
      data: {
        billingPeriod: period,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        storefrontOrderId: params.storefrontOrderId ?? undefined,
        updatedAt: new Date(),
      },
    });
    subscriptionId = updated.id;
  } else {
    const created = await prisma.lmsStudentSubscription.create({
      data: {
        organizationId: params.organizationId,
        planId: params.planId,
        studentUserId: params.studentUserId,
        status: LmsStudentSubscriptionStatus.ACTIVE,
        billingPeriod: period,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        storefrontOrderId: params.storefrontOrderId ?? undefined,
      },
    });
    subscriptionId = created.id;
  }

  await provisionEnrollmentsForSubscription({
    organizationId: params.organizationId,
    planId: params.planId,
    studentUserId: params.studentUserId,
    studentSubscriptionId: subscriptionId,
    periodEnd,
    storefrontOrderId: params.storefrontOrderId,
    crmCustomerId: params.crmCustomerId,
  });

  return prisma.lmsStudentSubscription.findFirst({
    where: { id: subscriptionId },
    include: { plan: { select: { id: true, name: true } } },
  });
}

export async function cancelStudentLmsSubscription(params: {
  organizationId: bigint;
  subscriptionId: bigint;
  studentUserId?: bigint;
}) {
  const sub = await prisma.lmsStudentSubscription.findFirst({
    where: {
      id: params.subscriptionId,
      organizationId: params.organizationId,
      ...(params.studentUserId != null ? { studentUserId: params.studentUserId } : {}),
    },
  });
  if (!sub) throw new Error("Subscription not found");

  await prisma.lmsStudentSubscription.update({
    where: { id: sub.id },
    data: {
      status: LmsStudentSubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return sub;
}

export async function listStudentSubscriptions(params: {
  organizationId: bigint;
  studentUserId: bigint;
}) {
  return prisma.lmsStudentSubscription.findMany({
    where: { organizationId: params.organizationId, studentUserId: params.studentUserId },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { id: true, name: true } } },
    take: 50,
  });
}

/** After paid storefront order, grant subscriptions for plan-linked POS products. */
export async function provisionLmsSubscriptionsForPaidStorefrontOrder(params: {
  orderId: bigint;
  organizationId: bigint;
}): Promise<void> {
  const order = await prisma.storefrontOrder.findFirst({
    where: { id: params.orderId, organizationId: params.organizationId, status: "paid" },
    include: {
      lines: { where: { productId: { not: null } } },
      storefrontCustomer: { select: { id: true, linkedUserId: true } },
    },
  });
  if (!order?.lines.length) return;

  const { resolveStudentUserIdForStorefrontOrder } = await import(
    "@/lib/lms-enrollment-service"
  );
  const studentUserId = await resolveStudentUserIdForStorefrontOrder({
    organizationId: order.organizationId,
    storefrontCustomerId: order.storefrontCustomerId,
    crmCustomerId: order.crmCustomerId,
    customerEmail: order.customerEmail,
  });
  if (studentUserId == null) return;

  for (const line of order.lines) {
    const pid = line.productId;
    if (pid == null) continue;
    const plans = await prisma.lmsSubscriptionPlan.findMany({
      where: { organizationId: order.organizationId, linkedPosProductId: pid, status: true },
      select: { id: true },
    });
    for (const plan of plans) {
      try {
        await subscribeStudentToLmsPlan({
          organizationId: order.organizationId,
          planId: plan.id,
          studentUserId,
          billingPeriod: "monthly",
          storefrontOrderId: order.id,
          crmCustomerId: order.crmCustomerId,
        });
      } catch (e) {
        console.warn("[lms-student-subscription] storefront provision failed:", e);
      }
    }
  }
}

export function planPriceForPeriod(
  plan: { packagePriceMonthly: Prisma.Decimal; packagePriceYearly: Prisma.Decimal; freePlan: boolean },
  period: LmsBillingPeriodInput,
): number {
  if (plan.freePlan) return 0;
  return period === "yearly" ? Number(plan.packagePriceYearly) : Number(plan.packagePriceMonthly);
}
