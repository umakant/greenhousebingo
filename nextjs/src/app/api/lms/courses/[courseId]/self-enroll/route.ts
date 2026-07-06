import { LmsCourseStatus, LmsEnrollmentPurchaseKind, LmsEnrollmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
  courseAllowsFreeEnrollment,
  courseRequiresManualPriceGrant,
  courseRequiresStorefrontPurchase,
  findCrmCustomerForOrgUser,
  upsertActiveEnrollment,
} from "@/lib/lms-enrollment-service";
import { parseBigIntId, serializeLmsEnrollment } from "@/lib/lms-enrollment-serialize";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { learnerIsFirstLmsPurchase, readLmsOrgSettings } from "@/lib/lms-org-settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Learner self-enrollment for free courses; paid storefront courses return checkout info. */
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

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      organizationId: actor.organizationId,
      status: { in: [LmsCourseStatus.PUBLISHED, LmsCourseStatus.SCHEDULED] },
    },
    select: {
      id: true,
      title: true,
      isPublic: true,
      linkedPosProductId: true,
      salePrice: true,
      accessStartsAt: true,
      accessEndsAt: true,
      linkedPosProduct: { select: { id: true, name: true, slug: true, price: true } },
    },
  });
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const existing = await prisma.enrollment.findUnique({
    where: {
      courseId_studentUserId: { courseId, studentUserId: actor.userId },
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      storefrontOrder: { select: { id: true, orderNumber: true, status: true } },
      crmCustomer: { select: { id: true, companyName: true, contactPersonEmail: true } },
    },
  });

  if (existing?.status === LmsEnrollmentStatus.ACTIVE) {
    return NextResponse.json({
      ok: true,
      alreadyEnrolled: true,
      enrollment: serializeLmsEnrollment(existing),
    });
  }

  if (!course.isPublic) {
    return NextResponse.json({ ok: false, message: "This course is not open for self-enrollment." }, { status: 403 });
  }

  if (courseRequiresStorefrontPurchase(course)) {
    const product = course.linkedPosProduct;
    const slug = product?.slug?.trim();
    const lmsSettings = await readLmsOrgSettings(actor.organizationId);
    const firstPurchase = await learnerIsFirstLmsPurchase({
      organizationId: actor.organizationId,
      studentUserId: actor.userId,
    });
    const couponCode =
      firstPurchase && lmsSettings.firstPurchaseCouponCode
        ? lmsSettings.firstPurchaseCouponCode
        : null;
    return NextResponse.json({
      ok: true,
      requiresCheckout: true,
      message: "Purchase this course through the shop to unlock access.",
      checkout: {
        productId: course.linkedPosProductId!.toString(),
        productName: product?.name ?? course.title,
        productSlug: slug ?? null,
        productPrice: product?.price != null ? Number(product.price) : null,
        shopProductUrl: slug ? `/shop/products/${encodeURIComponent(slug)}` : null,
        shopCartUrl: "/shop/cart",
        suggestedCouponCode: couponCode,
      },
    });
  }

  if (courseRequiresManualPriceGrant(course)) {
    return NextResponse.json(
      {
        ok: false,
        message: "This course requires administrator approval or payment outside the shop. Contact your training coordinator.",
      },
      { status: 403 },
    );
  }

  if (!courseAllowsFreeEnrollment(course)) {
    return NextResponse.json({ ok: false, message: "Unsupported course pricing configuration." }, { status: 400 });
  }

  const crmCustomerId = await findCrmCustomerForOrgUser({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
  });

  try {
    const row = await upsertActiveEnrollment({
      organizationId: actor.organizationId,
      courseId,
      studentUserId: actor.userId,
      crmCustomerId,
      purchaseKind: LmsEnrollmentPurchaseKind.FREE,
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
