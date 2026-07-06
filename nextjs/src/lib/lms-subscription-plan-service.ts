import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { LmsSubscriptionPlanRow } from "@/lib/lms-subscription-serialize";

const planCoursesInclude = {
  include: { course: { select: { id: true, title: true, slug: true, status: true } } },
  orderBy: { id: "asc" as const },
} satisfies Prisma.LmsSubscriptionPlan$planCoursesArgs;

const planInclude = {
  planCourses: planCoursesInclude,
  linkedPosProduct: { select: { id: true, name: true, slug: true, price: true } },
  _count: { select: { planCourses: true, subscriptions: { where: { status: "ACTIVE" as const } } } },
} satisfies Prisma.LmsSubscriptionPlanInclude;

const learnerPlanInclude = {
  planCourses: planCoursesInclude,
  linkedPosProduct: { select: { id: true, name: true, slug: true, price: true } },
  _count: { select: { planCourses: true } },
} satisfies Prisma.LmsSubscriptionPlanInclude;

export async function listLmsSubscriptionPlans(organizationId: bigint): Promise<LmsSubscriptionPlanRow[]> {
  return prisma.lmsSubscriptionPlan.findMany({
    where: { organizationId },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    include: planInclude,
    take: 200,
  });
}

export async function listActiveLmsSubscriptionPlansForLearner(organizationId: bigint) {
  return prisma.lmsSubscriptionPlan.findMany({
    where: { organizationId, status: true },
    orderBy: [{ name: "asc" }],
    include: learnerPlanInclude,
    take: 100,
  });
}

export async function getLmsSubscriptionPlan(organizationId: bigint, planId: bigint) {
  return prisma.lmsSubscriptionPlan.findFirst({
    where: { id: planId, organizationId },
    include: planInclude,
  });
}

export async function createLmsSubscriptionPlan(params: {
  organizationId: bigint;
  name: string;
  description?: string | null;
  status?: boolean;
  freePlan?: boolean;
  packagePriceMonthly?: number;
  packagePriceYearly?: number;
  trial?: boolean;
  trialDays?: number;
  linkedPosProductId?: bigint | null;
  courseIds?: bigint[];
}) {
  const plan = await prisma.lmsSubscriptionPlan.create({
    data: {
      organizationId: params.organizationId,
      name: params.name.trim().slice(0, 255),
      description: params.description?.trim() || null,
      status: params.status ?? true,
      freePlan: params.freePlan ?? false,
      packagePriceMonthly: new Prisma.Decimal(params.packagePriceMonthly ?? 0),
      packagePriceYearly: new Prisma.Decimal(params.packagePriceYearly ?? 0),
      trial: params.trial ?? false,
      trialDays: params.trialDays ?? 0,
      linkedPosProductId: params.linkedPosProductId ?? undefined,
    },
  });
  if (params.courseIds?.length) {
    await setLmsSubscriptionPlanCourses({
      organizationId: params.organizationId,
      planId: plan.id,
      courseIds: params.courseIds,
    });
  }
  return getLmsSubscriptionPlan(params.organizationId, plan.id);
}

export async function updateLmsSubscriptionPlan(params: {
  organizationId: bigint;
  planId: bigint;
  data: {
    name?: string;
    description?: string | null;
    status?: boolean;
    freePlan?: boolean;
    packagePriceMonthly?: number;
    packagePriceYearly?: number;
    trial?: boolean;
    trialDays?: number;
    linkedPosProductId?: bigint | null;
  };
}) {
  const patch: Prisma.LmsSubscriptionPlanUpdateInput = { updatedAt: new Date() };
  if (params.data.name != null) patch.name = params.data.name.trim().slice(0, 255);
  if (params.data.description !== undefined) patch.description = params.data.description?.trim() || null;
  if (params.data.status != null) patch.status = params.data.status;
  if (params.data.freePlan != null) patch.freePlan = params.data.freePlan;
  if (params.data.packagePriceMonthly != null) {
    patch.packagePriceMonthly = new Prisma.Decimal(params.data.packagePriceMonthly);
  }
  if (params.data.packagePriceYearly != null) {
    patch.packagePriceYearly = new Prisma.Decimal(params.data.packagePriceYearly);
  }
  if (params.data.trial != null) patch.trial = params.data.trial;
  if (params.data.trialDays != null) patch.trialDays = params.data.trialDays;
  if (params.data.linkedPosProductId !== undefined) {
    patch.linkedPosProduct = params.data.linkedPosProductId
      ? { connect: { id: params.data.linkedPosProductId } }
      : { disconnect: true };
  }

  await prisma.lmsSubscriptionPlan.updateMany({
    where: { id: params.planId, organizationId: params.organizationId },
    data: patch,
  });
  return getLmsSubscriptionPlan(params.organizationId, params.planId);
}

export async function deleteLmsSubscriptionPlan(organizationId: bigint, planId: bigint) {
  const n = await prisma.lmsSubscriptionPlan.deleteMany({
    where: { id: planId, organizationId },
  });
  return n.count > 0;
}

/** Replace bundle courses for a plan (validates org + published courses). */
export async function setLmsSubscriptionPlanCourses(params: {
  organizationId: bigint;
  planId: bigint;
  courseIds: bigint[];
}) {
  const plan = await prisma.lmsSubscriptionPlan.findFirst({
    where: { id: params.planId, organizationId: params.organizationId },
    select: { id: true },
  });
  if (!plan) throw new Error("Plan not found");

  const unique = [...new Set(params.courseIds.map((id) => id.toString()))].map((s) => BigInt(s));
  if (unique.length) {
    const found = await prisma.course.count({
      where: { organizationId: params.organizationId, id: { in: unique } },
    });
    if (found !== unique.length) throw new Error("One or more courses not found");
  }

  await prisma.$transaction([
    prisma.lmsSubscriptionPlanCourse.deleteMany({ where: { planId: params.planId } }),
    ...(unique.length
      ? [
          prisma.lmsSubscriptionPlanCourse.createMany({
            data: unique.map((courseId) => ({
              organizationId: params.organizationId,
              planId: params.planId,
              courseId,
            })),
          }),
        ]
      : []),
  ]);
}

/** Active plans that include a given course (for learner catalog). */
export async function listSubscriptionPlansForCourse(organizationId: bigint, courseId: bigint) {
  return prisma.lmsSubscriptionPlan.findMany({
    where: {
      organizationId,
      status: true,
      planCourses: { some: { courseId } },
    },
    select: {
      id: true,
      name: true,
      freePlan: true,
      packagePriceMonthly: true,
      packagePriceYearly: true,
      linkedPosProductId: true,
      linkedPosProduct: { select: { id: true, name: true, slug: true, price: true } },
      _count: { select: { planCourses: true } },
    },
    orderBy: { name: "asc" },
  });
}
