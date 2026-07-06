import { LmsEnrollmentPurchaseKind, LmsEnrollmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  assertPaidStorefrontOrderGrantsCourse,
  courseAllowsFreeEnrollment,
  courseRequiresManualPriceGrant,
  courseRequiresStorefrontPurchase,
  findCrmCustomerForOrgUser,
  upsertActiveEnrollment,
} from "@/lib/lms-enrollment-service";
import { parseBigIntId, parseUserIdFromBody, serializeLmsEnrollment } from "@/lib/lms-enrollment-serialize";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canManageCourseRoster(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms-instructors") ||
    hasPermission(perms, "manage-lms")
  );
}

async function loadCourseForOrg(courseId: bigint, organizationId: bigint) {
  return prisma.course.findFirst({
    where: { id: courseId, organizationId },
    select: {
      id: true,
      linkedPosProductId: true,
      salePrice: true,
      accessStartsAt: true,
      accessEndsAt: true,
    },
  });
}

/** List enrollments for a course (admin / roster managers). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const { courseId: courseIdStr } = await ctx.params;
  const courseId = parseBigIntId(courseIdStr);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const course = await loadCourseForOrg(courseId, actor.organizationId);
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canManageCourseRoster(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const rows = await prisma.enrollment.findMany({
    where: { courseId, organizationId: actor.organizationId },
    orderBy: [{ enrolledAt: "desc" }, { id: "desc" }],
    take: 500,
    include: {
      student: { select: { id: true, name: true, email: true } },
      storefrontOrder: { select: { id: true, orderNumber: true, status: true } },
      crmCustomer: { select: { id: true, companyName: true, contactPersonEmail: true } },
    },
  });

  return NextResponse.json({ ok: true, items: rows.map(serializeLmsEnrollment) });
}

/** Enroll a learner (free, paid via verified storefront order, manual/comped). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const { courseId: courseIdStr } = await ctx.params;
  const courseId = parseBigIntId(courseIdStr);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canManageCourseRoster(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId: actor.organizationId },
    select: {
      id: true,
      organizationId: true,
      linkedPosProductId: true,
      salePrice: true,
      accessStartsAt: true,
      accessEndsAt: true,
    },
  });
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const studentUserId = parseUserIdFromBody(body?.studentUserId);
  if (studentUserId == null) {
    return NextResponse.json({ ok: false, message: "studentUserId is required." }, { status: 400 });
  }

  const student = await prisma.user.findFirst({
    where: {
      id: studentUserId,
      OR: [{ id: actor.organizationId }, { createdBy: actor.organizationId }],
      type: { not: "superadmin" },
    },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ ok: false, message: "Learner user not found in this organization." }, { status: 404 });
  }

  const instructorUserId = parseUserIdFromBody(body?.instructorUserId);
  const orderIdRaw = parseUserIdFromBody(body?.storefrontOrderId);
  const crmFromBody = parseUserIdFromBody(body?.crmCustomerId);

  let purchaseKind: LmsEnrollmentPurchaseKind;
  let storefrontOrderId: bigint | null = orderIdRaw;
  let crmCustomerId: bigint | null = crmFromBody;

  if (courseRequiresStorefrontPurchase(course)) {
    if (storefrontOrderId == null) {
      return NextResponse.json(
        { ok: false, message: "This course requires a paid storefront order (linked POS product)." },
        { status: 400 },
      );
    }
    try {
      await assertPaidStorefrontOrderGrantsCourse({
        organizationId: actor.organizationId,
        courseId,
        storefrontOrderId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Order validation failed";
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }
    purchaseKind = LmsEnrollmentPurchaseKind.PAID_STOREFRONT;
    if (crmCustomerId == null) {
      const order = await prisma.storefrontOrder.findFirst({
        where: { id: storefrontOrderId, organizationId: actor.organizationId },
        select: { crmCustomerId: true },
      });
      crmCustomerId = order?.crmCustomerId ?? (await findCrmCustomerForOrgUser({
        organizationId: actor.organizationId,
        studentUserId,
      }));
    }
  } else if (courseAllowsFreeEnrollment(course)) {
    purchaseKind = LmsEnrollmentPurchaseKind.FREE;
    storefrontOrderId = null;
    if (crmCustomerId == null) {
      crmCustomerId = await findCrmCustomerForOrgUser({
        organizationId: actor.organizationId,
        studentUserId,
      });
    }
  } else if (courseRequiresManualPriceGrant(course)) {
    const rawKind = typeof body?.purchaseKind === "string" ? body.purchaseKind.toUpperCase() : "";
    if (rawKind === "COMPED") {
      purchaseKind = LmsEnrollmentPurchaseKind.COMPED;
    } else if (rawKind === "MANUAL") {
      purchaseKind = LmsEnrollmentPurchaseKind.MANUAL;
    } else {
      return NextResponse.json(
        { ok: false, message: "This course has a list price without a POS link. Use purchaseKind MANUAL or COMPED." },
        { status: 400 },
      );
    }
    storefrontOrderId = null;
    if (crmCustomerId == null) {
      crmCustomerId = await findCrmCustomerForOrgUser({
        organizationId: actor.organizationId,
        studentUserId,
      });
    }
  } else {
    return NextResponse.json({ ok: false, message: "Unsupported course pricing configuration." }, { status: 400 });
  }

  if (crmCustomerId != null) {
    const crmOk = await prisma.customer.findFirst({
      where: { id: crmCustomerId, createdBy: actor.organizationId },
      select: { id: true },
    });
    if (!crmOk) {
      return NextResponse.json({ ok: false, message: "crmCustomerId is not in this organization." }, { status: 400 });
    }
  }

  try {
    const row = await upsertActiveEnrollment({
      organizationId: actor.organizationId,
      courseId,
      studentUserId,
      instructorUserId,
      accessStartsAt: null,
      accessEndsAt: null,
      storefrontOrderId,
      crmCustomerId,
      purchaseKind,
    });
    const full = await prisma.enrollment.findFirst({
      where: { id: row.id },
      include: {
        student: { select: { id: true, name: true, email: true } },
        storefrontOrder: { select: { id: true, orderNumber: true, status: true } },
        crmCustomer: { select: { id: true, companyName: true, contactPersonEmail: true } },
      },
    });
    if (!full) {
      return NextResponse.json({ ok: true, enrollment: { id: row.id.toString() } });
    }
    return NextResponse.json({ ok: true, enrollment: serializeLmsEnrollment(full) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Enrollment failed";
    const status = msg.includes("capacity") ? 409 : 400;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
