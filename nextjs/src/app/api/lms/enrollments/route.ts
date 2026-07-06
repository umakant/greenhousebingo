import { LmsEnrollmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseBigIntId, serializeLmsEnrollment } from "@/lib/lms-enrollment-serialize";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canManageEnrollments(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-students") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms-instructors") ||
    hasPermission(perms, "manage-lms")
  );
}

/** Org-wide enrollment list for Students / roster admins. */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canManageEnrollments(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const url = req.nextUrl;
  const courseId = parseBigIntId(url.searchParams.get("courseId"));
  const studentUserId = parseBigIntId(url.searchParams.get("studentUserId"));
  const statusRaw = (url.searchParams.get("status") ?? "").trim().toUpperCase();
  const search = (url.searchParams.get("search") ?? "").trim();

  const where: {
    organizationId: bigint;
    courseId?: bigint;
    studentUserId?: bigint;
    status?: LmsEnrollmentStatus;
    OR?: Array<{
      student?: { name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } };
      course?: { title?: { contains: string; mode: "insensitive" } };
    }>;
  } = { organizationId: actor.organizationId };

  if (courseId != null) where.courseId = courseId;
  if (studentUserId != null) where.studentUserId = studentUserId;
  if (statusRaw && Object.values(LmsEnrollmentStatus).includes(statusRaw as LmsEnrollmentStatus)) {
    where.status = statusRaw as LmsEnrollmentStatus;
  }
  if (search) {
    where.OR = [
      { student: { name: { contains: search, mode: "insensitive" } } },
      { student: { email: { contains: search, mode: "insensitive" } } },
      { course: { title: { contains: search, mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.enrollment.findMany({
    where,
    orderBy: [{ enrolledAt: "desc" }, { id: "desc" }],
    take: 500,
    include: {
      student: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, slug: true } },
      storefrontOrder: { select: { id: true, orderNumber: true, status: true } },
      crmCustomer: { select: { id: true, companyName: true, contactPersonEmail: true } },
    },
  });

  return NextResponse.json({ ok: true, items: rows.map(serializeLmsEnrollment) });
}
