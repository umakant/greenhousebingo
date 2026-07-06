import type { Course, Prisma } from "@prisma/client";
import { LmsEnrollmentPurchaseKind, LmsEnrollmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function saleAmount(course: Pick<Course, "salePrice">): number {
  if (course.salePrice == null) return 0;
  return Number(course.salePrice);
}

/** Course sells via linked POS / storefront catalog — paid path uses `StorefrontOrder` lines. */
export function courseRequiresStorefrontPurchase(course: Pick<Course, "linkedPosProductId">): boolean {
  return course.linkedPosProductId != null;
}

/** Free self-serve / admin enroll without an order (no linked POS product and list price is zero). */
export function courseAllowsFreeEnrollment(course: Pick<Course, "linkedPosProductId" | "salePrice">): boolean {
  return course.linkedPosProductId == null && saleAmount(course) <= 0;
}

/** Direct list price without POS link — admin may grant MANUAL or COMPED only. */
export function courseRequiresManualPriceGrant(course: Pick<Course, "linkedPosProductId" | "salePrice">): boolean {
  return course.linkedPosProductId == null && saleAmount(course) > 0;
}

export async function resolveStudentUserIdForStorefrontOrder(params: {
  organizationId: bigint;
  storefrontCustomerId: bigint | null;
  crmCustomerId: bigint | null;
  customerEmail: string | null;
}): Promise<bigint | null> {
  if (params.storefrontCustomerId != null) {
    const sfc = await prisma.storefrontCustomer.findFirst({
      where: { id: params.storefrontCustomerId, organizationId: params.organizationId },
      select: { linkedUserId: true },
    });
    if (sfc?.linkedUserId) return sfc.linkedUserId;
  }
  if (params.crmCustomerId != null) {
    const c = await prisma.customer.findFirst({
      where: { id: params.crmCustomerId, createdBy: params.organizationId },
      select: { userId: true },
    });
    if (c?.userId) return c.userId;
  }
  const email = params.customerEmail?.trim();
  if (email) {
    const u = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        OR: [{ id: params.organizationId }, { createdBy: params.organizationId }],
        type: { not: "superadmin" },
      },
      select: { id: true },
    });
    if (u) return u.id;
  }
  return null;
}

async function countActiveEnrollments(courseId: bigint): Promise<number> {
  return prisma.enrollment.count({
    where: { courseId, status: LmsEnrollmentStatus.ACTIVE },
  });
}

type UpsertEnrollmentInput = {
  organizationId: bigint;
  courseId: bigint;
  studentUserId: bigint;
  instructorUserId?: bigint | null;
  accessStartsAt?: Date | null;
  accessEndsAt?: Date | null;
  storefrontOrderId?: bigint | null;
  crmCustomerId?: bigint | null;
  studentSubscriptionId?: bigint | null;
  purchaseKind: LmsEnrollmentPurchaseKind;
};

/** Create or refresh enrollment for a course seat (idempotent on course+student). */
export async function upsertActiveEnrollment(input: UpsertEnrollmentInput) {
  const course = await prisma.course.findFirst({
    where: { id: input.courseId, organizationId: input.organizationId },
    select: { id: true, capacity: true, accessStartsAt: true, accessEndsAt: true },
  });
  if (!course) throw new Error("Course not found");

  const existing = await prisma.enrollment.findUnique({
    where: {
      courseId_studentUserId: { courseId: input.courseId, studentUserId: input.studentUserId },
    },
    select: { id: true, status: true },
  });

  if (!existing && course.capacity != null) {
    const n = await countActiveEnrollments(input.courseId);
    if (n >= course.capacity) throw new Error("Course capacity reached");
  }

  const defaults: Prisma.EnrollmentUncheckedCreateInput = {
    organizationId: input.organizationId,
    courseId: input.courseId,
    studentUserId: input.studentUserId,
    instructorUserId: input.instructorUserId ?? undefined,
    status: LmsEnrollmentStatus.ACTIVE,
    accessStartsAt: input.accessStartsAt ?? course.accessStartsAt,
    accessEndsAt: input.accessEndsAt ?? course.accessEndsAt,
    storefrontOrderId: input.storefrontOrderId ?? undefined,
    crmCustomerId: input.crmCustomerId ?? undefined,
    studentSubscriptionId: input.studentSubscriptionId ?? undefined,
    purchaseKind: input.purchaseKind,
  };

  if (existing) {
    return prisma.enrollment.update({
      where: { id: existing.id },
      data: {
        status: LmsEnrollmentStatus.ACTIVE,
        instructorUserId: input.instructorUserId ?? undefined,
        accessStartsAt: input.accessStartsAt ?? undefined,
        accessEndsAt: input.accessEndsAt ?? undefined,
        storefrontOrderId: input.storefrontOrderId ?? undefined,
        crmCustomerId: input.crmCustomerId ?? undefined,
        studentSubscriptionId: input.studentSubscriptionId ?? undefined,
        purchaseKind: input.purchaseKind,
        completedAt: null,
      },
    });
  }

  const created = await prisma.enrollment.create({ data: defaults });
  const { notifyLmsEnrollmentConfirmation } = await import("@/lib/lms-notification-service");
  void notifyLmsEnrollmentConfirmation({
    organizationId: input.organizationId,
    enrollmentId: created.id,
  }).catch(() => undefined);
  return created;
}

/**
 * After a storefront order is marked paid, grant LMS seats for any order lines whose product
 * matches a course `linked_pos_product_id` in the same organization.
 */
export async function provisionLmsEnrollmentsForPaidStorefrontOrder(params: {
  orderId: bigint;
  organizationId: bigint;
}): Promise<void> {
  const order = await prisma.storefrontOrder.findFirst({
    where: { id: params.orderId, organizationId: params.organizationId, status: "paid" },
    include: {
      lines: { where: { productId: { not: null } }, include: { product: true } },
      storefrontCustomer: { select: { id: true, linkedUserId: true } },
    },
  });
  if (!order?.lines.length) return;

  const studentUserId = await resolveStudentUserIdForStorefrontOrder({
    organizationId: order.organizationId,
    storefrontCustomerId: order.storefrontCustomerId,
    crmCustomerId: order.crmCustomerId,
    customerEmail: order.customerEmail,
  });
  if (studentUserId == null) {
    console.warn(
      "[lms-enrollment-service] Paid storefront order has no resolvable learner user; skip auto-enrollment",
      { orderId: order.id.toString(), organizationId: order.organizationId.toString() },
    );
    return;
  }

  const crmId = order.crmCustomerId;

  for (const line of order.lines) {
    const pid = line.productId;
    if (pid == null) continue;
    const courses = await prisma.course.findMany({
      where: { organizationId: order.organizationId, linkedPosProductId: pid },
      select: { id: true },
    });
    for (const c of courses) {
      try {
        await upsertActiveEnrollment({
          organizationId: order.organizationId,
          courseId: c.id,
          studentUserId,
          storefrontOrderId: order.id,
          crmCustomerId: crmId,
          purchaseKind: LmsEnrollmentPurchaseKind.PAID_STOREFRONT,
        });
      } catch (e) {
        console.warn("[lms-enrollment-service] provision seat failed:", e);
      }
    }
  }

  const { provisionLmsSubscriptionsForPaidStorefrontOrder } = await import(
    "@/lib/lms-student-subscription-service"
  );
  await provisionLmsSubscriptionsForPaidStorefrontOrder({
    orderId: params.orderId,
    organizationId: params.organizationId,
  });

  const { recordLmsCommissionsForPaidStorefrontOrder } = await import(
    "@/lib/lms-instructor-commission-service"
  );
  await recordLmsCommissionsForPaidStorefrontOrder({
    orderId: params.orderId,
    organizationId: params.organizationId,
  }).catch((e) => console.warn("[lms-enrollment-service] commission accrual failed:", e));
}

export async function findCrmCustomerForOrgUser(params: {
  organizationId: bigint;
  studentUserId: bigint;
}): Promise<bigint | null> {
  const row = await prisma.customer.findFirst({
    where: { createdBy: params.organizationId, userId: params.studentUserId },
    select: { id: true },
  });
  return row?.id ?? null;
}

/** Validates a paid storefront order contains a line for this course’s linked POS product. */
export async function assertPaidStorefrontOrderGrantsCourse(params: {
  organizationId: bigint;
  courseId: bigint;
  storefrontOrderId: bigint;
}): Promise<void> {
  const course = await prisma.course.findFirst({
    where: { id: params.courseId, organizationId: params.organizationId },
    select: { linkedPosProductId: true },
  });
  if (!course?.linkedPosProductId) throw new Error("Course is not linked to a storefront product");

  const order = await prisma.storefrontOrder.findFirst({
    where: {
      id: params.storefrontOrderId,
      organizationId: params.organizationId,
      status: "paid",
    },
    include: { lines: { select: { productId: true } } },
  });
  if (!order) throw new Error("Order not found or not paid");

  const ok = order.lines.some((l) => l.productId != null && l.productId === course.linkedPosProductId);
  if (!ok) throw new Error("Order does not include this course's product");
}
