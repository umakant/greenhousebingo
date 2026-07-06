import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function expertiseFromBody(raw: unknown): object | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (!Array.isArray(raw)) return null;
  const out = raw.filter((x) => typeof x === "string").map((x) => String(x).trim()).filter(Boolean);
  return out;
}

/** Current user's instructor profile in their organization (GET) or upsert fields (PATCH). */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-lms-instructor-profile") &&
    !hasPermission(perms, "manage-lms-instructors") &&
    !hasPermission(perms, "manage-lms")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const row = await prisma.instructorProfile.findFirst({
    where: { organizationId: actor.organizationId, userId: actor.userId },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  if (!row) {
    return NextResponse.json({
      ok: true,
      profile: null,
      user: { id: actor.userId.toString(), name: null, email: null, avatar: null },
    });
  }

  return NextResponse.json({
    ok: true,
    profile: {
      id: row.id.toString(),
      organizationId: row.organizationId.toString(),
      userId: row.userId.toString(),
      displayName: row.displayName,
      headline: row.headline,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
      expertise: row.expertise,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? null,
    },
    user: row.user
      ? {
          id: row.user.id.toString(),
          name: row.user.name,
          email: row.user.email,
          avatar: row.user.avatar,
        }
      : null,
  });
}

export async function PATCH(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "manage-lms-instructor-profile") &&
    !hasPermission(perms, "manage-lms")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() || null : undefined;
  const headline = typeof body.headline === "string" ? body.headline.trim() || null : undefined;
  const bio = typeof body.bio === "string" ? body.bio.trim() || null : undefined;
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() || null : undefined;
  let expertise: object | null | undefined;
  if ("expertise" in body) {
    expertise = expertiseFromBody(body.expertise);
    if (expertise === null && body.expertise != null && !Array.isArray(body.expertise)) {
      return NextResponse.json({ ok: false, message: "expertise must be an array of strings or null." }, { status: 400 });
    }
  }

  const existing = await prisma.instructorProfile.findFirst({
    where: { organizationId: actor.organizationId, userId: actor.userId },
    select: { id: true },
  });

  if (existing) {
    await prisma.instructorProfile.update({
      where: { id: existing.id },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(headline !== undefined ? { headline } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(expertise !== undefined
          ? {
              expertise:
                expertise === null ? Prisma.JsonNull : (expertise as Prisma.InputJsonValue),
            }
          : {}),
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.instructorProfile.create({
      data: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        displayName: displayName ?? null,
        headline: headline ?? null,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
        expertise:
          expertise === undefined
            ? undefined
            : expertise === null
              ? Prisma.JsonNull
              : (expertise as Prisma.InputJsonValue),
        isActive: true,
      },
    });
  }

  const row = await prisma.instructorProfile.findFirst({
    where: { organizationId: actor.organizationId, userId: actor.userId },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });

  return NextResponse.json({
    ok: true,
    profile: row
      ? {
          id: row.id.toString(),
          displayName: row.displayName,
          headline: row.headline,
          bio: row.bio,
          avatarUrl: row.avatarUrl,
          expertise: row.expertise,
          isActive: row.isActive,
        }
      : null,
  });
}
