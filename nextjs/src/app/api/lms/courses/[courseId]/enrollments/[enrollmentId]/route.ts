import { LmsEnrollmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parseUserId(raw: unknown): bigint | null {
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

function canManageCourseRoster(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms-instructors") ||
    hasPermission(perms, "manage-lms")
  );
}

function parseIso(raw: unknown): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Update enrollment status, access window, or assigned instructor. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ courseId: string; enrollmentId: string }> },
) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const { courseId: cStr, enrollmentId: eStr } = await ctx.params;
  const courseId = parseId(cStr);
  const enrollmentId = parseId(eStr);
  if (courseId == null || enrollmentId == null) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canManageCourseRoster(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const existing = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, courseId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Enrollment not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const data: {
    status?: LmsEnrollmentStatus;
    accessStartsAt?: Date | null;
    accessEndsAt?: Date | null;
    completedAt?: Date | null;
    instructorUserId?: bigint | null;
  } = {};

  if (body && typeof body.status === "string") {
    const s = body.status.toUpperCase();
    const allowed = new Set<string>(Object.values(LmsEnrollmentStatus));
    if (allowed.has(s)) {
      data.status = s as LmsEnrollmentStatus;
    } else {
      return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
    }
  }

  const a1 = parseIso(body?.accessStartsAt);
  const a2 = parseIso(body?.accessEndsAt);
  const done = parseIso(body?.completedAt);
  if (a1 !== undefined) data.accessStartsAt = a1;
  if (a2 !== undefined) data.accessEndsAt = a2;
  if (done !== undefined) data.completedAt = done;

  if (body && "instructorUserId" in body) {
    const iid = parseUserId(body.instructorUserId);
    if (iid != null) {
      const u = await prisma.user.findFirst({
        where: {
          id: iid,
          OR: [{ id: actor.organizationId }, { createdBy: actor.organizationId }],
          type: { not: "superadmin" },
        },
        select: { id: true },
      });
      if (!u) {
        return NextResponse.json({ ok: false, message: "Instructor user not found." }, { status: 400 });
      }
      data.instructorUserId = iid;
    } else {
      data.instructorUserId = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, message: "No valid fields to update." }, { status: 400 });
  }

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data,
  });

  return NextResponse.json({ ok: true });
}
