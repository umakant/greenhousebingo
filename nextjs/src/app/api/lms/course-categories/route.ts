import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

import { slugifyCourseTitle } from "@/lib/lms-course-slug";

export const dynamic = "force-dynamic";

function canManage(perms: string[]): boolean {
  return perms.includes("*") || hasPermission(perms, "manage-lms-courses") || hasPermission(perms, "manage-lms");
}

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManage(perms) && !hasPermission(perms, "manage-lms-instructor-courses")) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const rows = await prisma.courseCategory.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 500,
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id.toString(),
      name: r.name,
      slug: r.slug,
      sortOrder: r.sortOrder,
    })),
  });
}

export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManage(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ ok: false, message: "name is required." }, { status: 400 });
  }
  const slugBase = typeof body?.slug === "string" && body.slug.trim() ? slugifyCourseTitle(body.slug) : slugifyCourseTitle(name);
  const slug = await allocateUniqueCategorySlug(actor.organizationId, slugBase);

  const row = await prisma.courseCategory.create({
    data: {
      organizationId: actor.organizationId,
      name: name.slice(0, 255),
      slug,
      description: typeof body?.description === "string" ? body.description.trim() || null : null,
      sortOrder: typeof body?.sortOrder === "number" && Number.isFinite(body.sortOrder) ? Math.floor(body.sortOrder) : 0,
    },
  });

  return NextResponse.json({
    ok: true,
    item: { id: row.id.toString(), name: row.name, slug: row.slug, sortOrder: row.sortOrder },
  });
}

async function allocateUniqueCategorySlug(organizationId: bigint, baseSlug: string): Promise<string> {
  let slug = baseSlug || "category";
  let n = 0;
  for (;;) {
    const exists = await prisma.courseCategory.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    });
    if (!exists) return slug.slice(0, 255);
    n += 1;
    slug = `${baseSlug || "category"}-${n}`.slice(0, 255);
  }
}
