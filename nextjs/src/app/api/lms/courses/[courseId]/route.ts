import { NextRequest, NextResponse } from "next/server";
import { LmsCourseStatus, LmsDeliveryType, Prisma } from "@prisma/client";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { allocateUniqueCourseSlug, slugifyCourseTitle } from "@/lib/lms-course-slug";
import { serializeLmsCourse } from "@/lib/lms-course-serialize";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const courseInclude = {
  category: { select: { id: true, name: true, slug: true } as const },
  linkedPosProduct: { select: { id: true, name: true, price: true, sku: true, slug: true } as const },
  instructors: {
    orderBy: [{ isPrimary: "desc" as const }, { id: "asc" as const }],
    include: {
      instructorProfile: {
        select: { id: true, displayName: true, user: { select: { id: true, name: true, email: true } } },
      },
    },
  },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseInclude;

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

async function userIsAssignedInstructor(userId: bigint, courseId: bigint, organizationId: bigint): Promise<boolean> {
  const n = await prisma.courseInstructor.count({
    where: { courseId, organizationId, instructorProfile: { userId } },
  });
  return n > 0;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const { courseId: raw } = await ctx.params;
  const courseId = parseId(raw);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const perms = await getPermissionsFromRequest(req);
  const admin = canManageCourses(perms);
  const instructorView = !admin && canViewAssignedCourses(perms);
  if (!admin && !instructorView) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId: actor.organizationId },
    include: courseInclude,
  });
  if (!course) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  if (!admin) {
    const ok = await userIsAssignedInstructor(actor.userId, courseId, actor.organizationId);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true, course: serializeLmsCourse(course) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageCourses(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { courseId: raw } = await ctx.params;
  const courseId = parseId(raw);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const existing = await prisma.course.findFirst({
    where: { id: courseId, organizationId: actor.organizationId },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const data: Prisma.CourseUpdateInput = { updatedBy: { connect: { id: actor.userId } } };

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) {
      return NextResponse.json({ ok: false, message: "title cannot be empty." }, { status: 400 });
    }
    data.title = t.slice(0, 512);
  }

  if (typeof body.slug === "string" && body.slug.trim()) {
    const nextBase = slugifyCourseTitle(body.slug);
    const nextSlug = await allocateUniqueCourseSlug(actor.organizationId, nextBase, courseId);
    data.slug = nextSlug.slice(0, 255);
  }

  if (typeof body.description === "string") {
    data.description = body.description.trim() || null;
  }

  if (body.deliveryType !== undefined) {
    const d = parseDelivery(body.deliveryType);
    if (!d) {
      return NextResponse.json({ ok: false, message: "Invalid deliveryType." }, { status: 400 });
    }
    data.deliveryType = d;
  }

  if (typeof body.isPublic === "boolean") {
    data.isPublic = body.isPublic;
  }

  if ("capacity" in body) {
    const capacityRaw = body.capacity;
    if (capacityRaw === null || capacityRaw === "") {
      data.capacity = null;
    } else if (typeof capacityRaw === "number" && Number.isFinite(capacityRaw) && capacityRaw >= 0) {
      data.capacity = Math.floor(capacityRaw);
    } else {
      return NextResponse.json({ ok: false, message: "Invalid capacity." }, { status: 400 });
    }
  }

  if ("accessStartsAt" in body) {
    const d = parseOptionalDate(body.accessStartsAt);
    if (d === undefined && body.accessStartsAt != null && body.accessStartsAt !== "") {
      return NextResponse.json({ ok: false, message: "Invalid accessStartsAt." }, { status: 400 });
    }
    if (d !== undefined) data.accessStartsAt = d;
  }
  if ("accessEndsAt" in body) {
    const d = parseOptionalDate(body.accessEndsAt);
    if (d === undefined && body.accessEndsAt != null && body.accessEndsAt !== "") {
      return NextResponse.json({ ok: false, message: "Invalid accessEndsAt." }, { status: 400 });
    }
    if (d !== undefined) data.accessEndsAt = d;
  }

  if (body.status !== undefined) {
    const s = parseStatus(body.status);
    if (!s) {
      return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
    }
    data.status = s;
  }

  if ("categoryId" in body) {
    if (body.categoryId === null || body.categoryId === "") {
      data.category = { disconnect: true };
    } else {
      const cid = parseId(typeof body.categoryId === "string" ? body.categoryId : null);
      if (cid == null) {
        return NextResponse.json({ ok: false, message: "Invalid categoryId." }, { status: 400 });
      }
      const cat = await prisma.courseCategory.findFirst({
        where: { id: cid, organizationId: actor.organizationId },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ ok: false, message: "category not found." }, { status: 400 });
      }
      data.category = { connect: { id: cid } };
    }
  }

  if ("coverImageUrl" in body) {
    if (body.coverImageUrl === null || body.coverImageUrl === "") {
      data.coverImageUrl = null;
    } else if (typeof body.coverImageUrl === "string") {
      data.coverImageUrl = body.coverImageUrl.trim().slice(0, 2048) || null;
    }
  }

  if ("videoEmbedUrl" in body) {
    if (body.videoEmbedUrl === null || body.videoEmbedUrl === "") {
      data.videoEmbedUrl = null;
    } else if (typeof body.videoEmbedUrl === "string") {
      data.videoEmbedUrl = body.videoEmbedUrl.trim().slice(0, 2048) || null;
    }
  }

  if ("pdfDocumentUrl" in body) {
    if (body.pdfDocumentUrl === null || body.pdfDocumentUrl === "") {
      data.pdfDocumentUrl = null;
    } else if (typeof body.pdfDocumentUrl === "string") {
      data.pdfDocumentUrl = body.pdfDocumentUrl.trim().slice(0, 2048) || null;
    }
  }

  let linkedAfterPatch: bigint | null | undefined;
  if ("linkedPosProductId" in body) {
    if (body.linkedPosProductId === null || body.linkedPosProductId === "") {
      data.linkedPosProduct = { disconnect: true };
      linkedAfterPatch = null;
    } else {
      const pid = parseId(typeof body.linkedPosProductId === "string" ? body.linkedPosProductId : null);
      if (pid == null) {
        return NextResponse.json({ ok: false, message: "Invalid linkedPosProductId." }, { status: 400 });
      }
      const p = await prisma.posProduct.findFirst({
        where: { id: pid, organizationId: actor.organizationId },
        select: { id: true },
      });
      if (!p) {
        return NextResponse.json({ ok: false, message: "linked POS product not found." }, { status: 400 });
      }
      data.linkedPosProduct = { connect: { id: pid } };
      data.salePrice = null;
      linkedAfterPatch = pid;
    }
  }

  if ("salePrice" in body || "saleCurrency" in body) {
    const effectiveLinked =
      linkedAfterPatch !== undefined
        ? linkedAfterPatch
        : (
            await prisma.course.findFirst({
              where: { id: courseId, organizationId: actor.organizationId },
              select: { linkedPosProductId: true },
            })
          )?.linkedPosProductId ?? null;
    if (effectiveLinked == null) {
      if ("salePrice" in body) {
        const sp = parseSalePrice(body.salePrice);
        if (sp === undefined && body.salePrice !== null && body.salePrice !== "") {
          return NextResponse.json({ ok: false, message: "Invalid salePrice." }, { status: 400 });
        }
        if (sp !== undefined) data.salePrice = sp;
      }
      if (typeof body.saleCurrency === "string" && body.saleCurrency.trim().length === 3) {
        data.saleCurrency = body.saleCurrency.trim().toUpperCase();
      }
    }
  }

  const instructorRows = parseInstructorRows(body);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id: courseId, organizationId: actor.organizationId },
        data,
      });

      if (instructorRows !== undefined) {
        if (instructorRows.length) {
          const ids = instructorRows.map((r) => r.instructorProfileId);
          const n = await tx.instructorProfile.count({
            where: { id: { in: ids }, organizationId: actor.organizationId, isActive: true },
          });
          if (n !== ids.length) {
            throw new Error("INVALID_INSTRUCTORS");
          }
        }
        await tx.courseInstructor.deleteMany({
          where: { courseId, organizationId: actor.organizationId },
        });
        for (const r of instructorRows) {
          await tx.courseInstructor.create({
            data: {
              organizationId: actor.organizationId,
              courseId,
              instructorProfileId: r.instructorProfileId,
              role: r.role,
              isPrimary: r.isPrimary,
            },
          });
        }
      }

      return tx.course.findFirstOrThrow({
        where: { id: courseId, organizationId: actor.organizationId },
        include: courseInclude,
      });
    });

    return NextResponse.json({ ok: true, course: serializeLmsCourse(updated) });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_INSTRUCTORS") {
      return NextResponse.json({ ok: false, message: "One or more instructor profiles are invalid." }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageCourses(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { courseId: raw } = await ctx.params;
  const courseId = parseId(raw);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const del = await prisma.course.deleteMany({
    where: { id: courseId, organizationId: actor.organizationId },
  });
  if (del.count === 0) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
