import type { LmsEnrollmentPurchaseKind, LmsEnrollmentStatus } from "@prisma/client";

export function parseBigIntId(raw: string | undefined | null): bigint | null {
  if (raw == null || typeof raw !== "string") return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

export function parseUserIdFromBody(raw: unknown): bigint | null {
  if (raw == null) return null;
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    try {
      return BigInt(Math.floor(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw === "string") {
    try {
      return BigInt(raw.trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function serializeLmsEnrollment(row: {
  id: bigint;
  courseId: bigint;
  studentUserId: bigint;
  instructorUserId: bigint | null;
  status: LmsEnrollmentStatus;
  purchaseKind: LmsEnrollmentPurchaseKind | null;
  storefrontOrderId: bigint | null;
  crmCustomerId: bigint | null;
  enrolledAt: Date;
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
  completedAt: Date | null;
  student: { id: bigint; name: string | null; email: string | null };
  course?: { id: bigint; title: string; slug: string } | null;
  storefrontOrder: { id: bigint; orderNumber: string; status: string } | null;
  crmCustomer: { id: bigint; companyName: string; contactPersonEmail: string } | null;
}) {
  return {
    id: row.id.toString(),
    courseId: row.courseId.toString(),
    studentUserId: row.studentUserId.toString(),
    instructorUserId: row.instructorUserId?.toString() ?? null,
    status: row.status,
    purchaseKind: row.purchaseKind,
    storefrontOrderId: row.storefrontOrderId?.toString() ?? null,
    crmCustomerId: row.crmCustomerId?.toString() ?? null,
    enrolledAt: row.enrolledAt.toISOString(),
    accessStartsAt: row.accessStartsAt?.toISOString() ?? null,
    accessEndsAt: row.accessEndsAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    student: {
      id: row.student.id.toString(),
      name: row.student.name,
      email: row.student.email,
    },
    course: row.course
      ? { id: row.course.id.toString(), title: row.course.title, slug: row.course.slug }
      : null,
    storefrontOrder: row.storefrontOrder
      ? {
          id: row.storefrontOrder.id.toString(),
          orderNumber: row.storefrontOrder.orderNumber,
          status: row.storefrontOrder.status,
        }
      : null,
    crmCustomer: row.crmCustomer
      ? {
          id: row.crmCustomer.id.toString(),
          companyName: row.crmCustomer.companyName,
          contactPersonEmail: row.crmCustomer.contactPersonEmail,
        }
      : null,
  };
}
