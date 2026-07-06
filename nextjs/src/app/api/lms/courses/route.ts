import { NextRequest, NextResponse } from "next/server";
import { LmsCourseStatus, LmsDeliveryType, LmsEnrollmentStatus, Prisma } from "@prisma/client";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { allocateUniqueCourseSlug, slugifyCourseTitle } from "@/lib/lms-course-slug";
import { serializeLmsCourse } from "@/lib/lms-course-serialize";
import { LEARNER_ENROLLMENT_STATUSES, LEARNER_VISIBLE_STATUS } from "@/lib/lms-course-access";
import {
  courseAllowsFreeEnrollment,
  courseRequiresManualPriceGrant,
  courseRequiresStorefrontPurchase,
} from "@/lib/lms-enrollment-service";
import { listSubscriptionPlansForCourse } from "@/lib/lms-subscription-plan-service";
import { learnerHasActiveSubscriptionForCourse } from "@/lib/lms-student-subscription-service";
import { getCourseReviewSummariesBatch } from "@/lib/lms-course-review-service";
import { canListLmsCoursesForMeetings } from "@/lib/lms-live-session-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string | undefined | null): bigint | null {
  if (raw == null || typeof raw !== "string") return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

function canManageCourses(perms: string[]): boolean {
  return perms.includes("*") || hasPermission(perms, "manage-lms-courses") || hasPermission(perms, "manage-lms");
}

function canViewAssignedCourses(perms: string[]): boolean {
  return (
    hasPermission(perms, "manage-lms-instructor-courses") ||
    hasPermission(perms, "view-lms-instructor-assignments") ||
    hasPermission(perms, "manage-lms-instructor-dashboard")
  );
}

const DELIVERY: LmsDeliveryType[] = [LmsDeliveryType.VIDEO, LmsDeliveryType.TEXT, LmsDeliveryType.LIVE_CLASS];
const STATUS: LmsCourseStatus[] = [
  LmsCourseStatus.DRAFT,
  LmsCourseStatus.PUBLISHED,
  LmsCourseStatus.ARCHIVED,
  LmsCourseStatus.SCHEDULED,
];

function parseDelivery(v: unknown): LmsDeliveryType | null {
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase().replace(/-/g, "_");
  return DELIVERY.includes(u as LmsDeliveryType) ? (u as LmsDeliveryType) : null;
}

function parseStatus(v: unknown): LmsCourseStatus | null {
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase();
  return STATUS.includes(u as LmsCourseStatus) ? (u as LmsCourseStatus) : null;
}

function parseOptionalDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseSalePrice(v: unknown): Prisma.Decimal | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0) return undefined;
  return new Prisma.Decimal(n);
}

type InstructorRow = { instructorProfileId: bigint; role: string | null; isPrimary: boolean };

function parseInstructorRows(body: Record<string, unknown> | null): InstructorRow[] | undefined {
  if (body == null || !("instructors" in body)) return undefined;
  const raw = body.instructors;
  if (!Array.isArray(raw)) return undefined;
  const out: InstructorRow[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (item == null || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const pid = parseId(typeof o.instructorProfileId === "string" ? o.instructorProfileId : null);
    if (pid == null) continue;
    const key = pid.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    const role = typeof o.role === "string" ? o.role.trim().slice(0, 64) || null : null;
    const isPrimary = typeof o.isPrimary === "boolean" ? o.isPrimary : false;
    out.push({ instructorProfileId: pid, role, isPrimary });
  }
  let primarySet = false;
  for (const row of out) {
    if (row.isPrimary) {
      if (primarySet) row.isPrimary = false;
      else primarySet = true;
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const view = req.nextUrl.searchParams.get("view")?.trim().toLowerCase();
  if (view === "learner") {
    const where: Prisma.CourseWhereInput = {
      organizationId: actor.organizationId,
      status: { in: LEARNER_VISIBLE_STATUS },
      OR: [
        { isPublic: true },
        {
          enrollments: {
            some: { studentUserId: actor.userId, status: { in: LEARNER_ENROLLMENT_STATUSES } },
          },
        },
      ],
    };
    const rows = await prisma.course.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 200,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        linkedPosProduct: { select: { id: true, name: true, slug: true, price: true } },
        enrollments: {
          where: { studentUserId: actor.userId, status: { in: LEARNER_ENROLLMENT_STATUSES } },
          select: { id: true },
          take: 1,
        },
        _count: {
          select: {
            enrollments: { where: { status: LmsEnrollmentStatus.ACTIVE } },
          },
        },
      },
    });
    const reviewSummaries = await getCourseReviewSummariesBatch(
      actor.organizationId,
      rows.map((r) => r.id),
    );
    const items = await Promise.all(
      rows.map(async (r) => {
        const pricingPick = {
          linkedPosProductId: r.linkedPosProductId,
          salePrice: r.salePrice,
        };
        const linked = r.linkedPosProduct;
        const [subscriptionPlans, activeSub] = await Promise.all([
          listSubscriptionPlansForCourse(actor.organizationId, r.id),
          learnerHasActiveSubscriptionForCourse({
            organizationId: actor.organizationId,
            studentUserId: actor.userId,
            courseId: r.id,
          }),
        ]);
        const reviewSummary = reviewSummaries.get(r.id.toString()) ?? {
          averageRating: null,
          approvedCount: 0,
        };
        return {
          id: r.id.toString(),
          title: r.title,
          slug: r.slug,
          status: r.status,
          deliveryType: r.deliveryType,
          isPublic: r.isPublic,
          reviewSummary,
          category: r.category
            ? { id: r.category.id.toString(), name: r.category.name, slug: r.category.slug }
            : null,
          isEnrolled: r.enrollments.length > 0,
          activeEnrollmentCount: r._count.enrollments,
          capacity: r.capacity,
          seatsRemaining: r.capacity != null ? Math.max(0, r.capacity - r._count.enrollments) : null,
          pricing: {
            requiresStorefrontPurchase: courseRequiresStorefrontPurchase(pricingPick),
            allowsFreeEnrollment: courseAllowsFreeEnrollment(pricingPick),
            requiresManualGrant: courseRequiresManualPriceGrant(pricingPick),
            salePrice: r.salePrice != null ? r.salePrice.toString() : null,
            saleCurrency: r.saleCurrency,
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
            subscriptionPlans: subscriptionPlans.map((p) => ({
              id: p.id.toString(),
              name: p.name,
              freePlan: p.freePlan,
              packagePriceMonthly: p.packagePriceMonthly.toString(),
              packagePriceYearly: p.packagePriceYearly.toString(),
              courseCount: p._count.planCourses,
              linkedProduct: p.linkedPosProduct
                ? {
                    id: p.linkedPosProduct.id.toString(),
                    shopUrl: p.linkedPosProduct.slug?.trim()
                      ? `/shop/products/${encodeURIComponent(p.linkedPosProduct.slug.trim())}`
                      : null,
                  }
                : null,
            })),
            hasActiveSubscription: activeSub.ok,
          },
        };
      }),
    );
    return NextResponse.json({ ok: true, items });
  }

  const perms = await getPermissionsFromRequest(req);
  const admin = canManageCourses(perms);
  const instructorView = !admin && canViewAssignedCourses(perms);
  const meetingsView = !admin && !instructorView && canListLmsCoursesForMeetings(perms);
  if (!admin && !instructorView && !meetingsView) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const where: Prisma.CourseWhereInput = { organizationId: actor.organizationId };
  if (instructorView) {
    where.instructors = { some: { instructorProfile: { userId: actor.userId } } };
  }

  const rows = await prisma.course.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 200,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      linkedPosProduct: { select: { id: true, name: true, price: true, sku: true, slug: true } },
      instructors: {
        orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
        include: {
          instructorProfile: {
            select: { id: true, displayName: true, user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json({ ok: true, items: rows.map(serializeLmsCourse) });
}

export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageCourses(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ ok: false, message: "title is required." }, { status: 400 });
  }
  const deliveryType = parseDelivery(body?.deliveryType) ?? LmsDeliveryType.VIDEO;
  const status = parseStatus(body?.status) ?? LmsCourseStatus.DRAFT;

  const slugInput = typeof body?.slug === "string" ? body.slug.trim() : "";
  const slugBase = slugInput ? slugifyCourseTitle(slugInput) : slugifyCourseTitle(title);
  const slug = await allocateUniqueCourseSlug(actor.organizationId, slugBase);

  const categoryId = parseId(typeof body?.categoryId === "string" ? body.categoryId : null);
  if (categoryId != null) {
    const cat = await prisma.courseCategory.findFirst({
      where: { id: categoryId, organizationId: actor.organizationId },
      select: { id: true },
    });
    if (!cat) {
      return NextResponse.json({ ok: false, message: "category not found." }, { status: 400 });
    }
  }

  let linkedPosProductId = parseId(typeof body?.linkedPosProductId === "string" ? body.linkedPosProductId : null);
  if (linkedPosProductId != null) {
    const p = await prisma.posProduct.findFirst({
      where: { id: linkedPosProductId, organizationId: actor.organizationId },
      select: { id: true },
    });
    if (!p) {
      return NextResponse.json({ ok: false, message: "linked POS product not found." }, { status: 400 });
    }
  } else {
    linkedPosProductId = null;
  }

  const salePrice = parseSalePrice(body?.salePrice);
  if (salePrice === undefined && body?.salePrice !== undefined && body?.salePrice !== null && body?.salePrice !== "") {
    return NextResponse.json({ ok: false, message: "Invalid salePrice." }, { status: 400 });
  }

  const saleCurrency =
    typeof body?.saleCurrency === "string" && body.saleCurrency.trim().length === 3
      ? body.saleCurrency.trim().toUpperCase()
      : "USD";

  const capacityRaw = body?.capacity;
  let capacity: number | null = null;
  if (capacityRaw === null || capacityRaw === "" || capacityRaw === undefined) {
    capacity = null;
  } else if (typeof capacityRaw === "number" && Number.isFinite(capacityRaw) && capacityRaw >= 0) {
    capacity = Math.floor(capacityRaw);
  } else {
    return NextResponse.json({ ok: false, message: "Invalid capacity." }, { status: 400 });
  }

  const accessStartsAt = parseOptionalDate(body?.accessStartsAt);
  const accessEndsAt = parseOptionalDate(body?.accessEndsAt);
  if (accessStartsAt === undefined && body?.accessStartsAt != null && body?.accessStartsAt !== "") {
    return NextResponse.json({ ok: false, message: "Invalid accessStartsAt." }, { status: 400 });
  }
  if (accessEndsAt === undefined && body?.accessEndsAt != null && body?.accessEndsAt !== "") {
    return NextResponse.json({ ok: false, message: "Invalid accessEndsAt." }, { status: 400 });
  }

  const instructorRows = parseInstructorRows(body) ?? [];
  if (instructorRows.length) {
    const ids = instructorRows.map((r) => r.instructorProfileId);
    const n = await prisma.instructorProfile.count({
      where: { id: { in: ids }, organizationId: actor.organizationId, isActive: true },
    });
    if (n !== ids.length) {
      return NextResponse.json({ ok: false, message: "One or more instructor profiles are invalid." }, { status: 400 });
    }
  }

  const description = typeof body?.description === "string" ? body.description.trim() || null : null;
  const isPublic = typeof body?.isPublic === "boolean" ? body.isPublic : false;
  const coverImageUrl =
    typeof body?.coverImageUrl === "string" ? body.coverImageUrl.trim().slice(0, 2048) || null : null;
  const videoEmbedUrl =
    typeof body?.videoEmbedUrl === "string" ? body.videoEmbedUrl.trim().slice(0, 2048) || null : null;
  const pdfDocumentUrl =
    typeof body?.pdfDocumentUrl === "string" ? body.pdfDocumentUrl.trim().slice(0, 2048) || null : null;

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        organizationId: actor.organizationId,
        categoryId: categoryId ?? undefined,
        title: title.slice(0, 512),
        slug: slug.slice(0, 255),
        description,
        deliveryType,
        isPublic,
        capacity,
        accessStartsAt: accessStartsAt ?? null,
        accessEndsAt: accessEndsAt ?? null,
        status,
        coverImageUrl,
        videoEmbedUrl,
        pdfDocumentUrl,
        salePrice: linkedPosProductId != null ? null : salePrice ?? null,
        saleCurrency,
        linkedPosProductId,
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    for (const r of instructorRows) {
      await tx.courseInstructor.create({
        data: {
          organizationId: actor.organizationId,
          courseId: course.id,
          instructorProfileId: r.instructorProfileId,
          role: r.role,
          isPrimary: r.isPrimary,
        },
      });
    }

    return tx.course.findFirstOrThrow({
      where: { id: course.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        linkedPosProduct: { select: { id: true, name: true, price: true, sku: true, slug: true } },
        instructors: {
          orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
          include: {
            instructorProfile: {
              select: { id: true, displayName: true, user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
  });

  return NextResponse.json({ ok: true, course: serializeLmsCourse(created) });
}
