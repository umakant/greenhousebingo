import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseUserId(raw: unknown): bigint | null {
  if (typeof raw !== "string") return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

/** Directory of instructor profiles for the tenant (admin). */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-lms-instructors") &&
    !hasPermission(perms, "manage-lms-courses") &&
    !hasPermission(perms, "manage-lms")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const rows = await prisma.instructorProfile.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }, { id: "asc" }],
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      _count: { select: { courseLinks: true } },
    },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id.toString(),
      userId: r.userId.toString(),
      displayName: r.displayName,
      headline: r.headline,
      bio: r.bio,
      avatarUrl: r.avatarUrl,
      expertise: r.expertise,
      isActive: r.isActive,
      commissionPercent: r.commissionPercent.toString(),
      courseCount: r._count.courseLinks,
      user: r.user
        ? { id: r.user.id.toString(), name: r.user.name, email: r.user.email, avatar: r.user.avatar }
        : null,
    })),
  });
}

/** Create an instructor profile for a user already in the organization (admin). */
export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!perms.includes("*") && !hasPermission(perms, "manage-lms-instructors") && !hasPermission(perms, "manage-lms")) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const targetUserId = parseUserId(body?.userId);
  if (targetUserId == null) {
    return NextResponse.json({ ok: false, message: "userId is required." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      OR: [{ id: actor.organizationId }, { createdBy: actor.organizationId }],
      type: { not: "superadmin" },
    },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ ok: false, message: "User not found in this organization." }, { status: 404 });
  }

  const existing = await prisma.instructorProfile.findFirst({
    where: { organizationId: actor.organizationId, userId: targetUserId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id.toString(), created: false });
  }

  const row = await prisma.instructorProfile.create({
    data: {
      organizationId: actor.organizationId,
      userId: targetUserId,
      isActive: true,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: row.id.toString(), created: true });
}
