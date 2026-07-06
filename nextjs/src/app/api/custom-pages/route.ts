import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function requirePerm(req: NextRequest, perm: string) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, perm) && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = requirePerm(req, "manage-custom-pages");
  if (blocked) return blocked;

  const title = req.nextUrl.searchParams.get("title") || "";
  const pages = await prisma.customPage.findMany({
    where: title ? { title: { contains: title, mode: "insensitive" } } : undefined,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, isActive: true, isDisabled: true, createdAt: true, updatedAt: true },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    pages: pages.map((p) => ({
      id: p.id.toString(),
      title: p.title,
      slug: p.slug,
      isActive: p.isActive,
      isDisabled: p.isDisabled,
      updatedAt: (p.updatedAt ?? p.createdAt).toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const blocked = requirePerm(req, "create-custom-pages");
  if (blocked) return blocked;

  const body = (await req.json().catch(() => null)) as any;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const content = typeof body?.content === "string" ? body.content : "";
  const metaTitle = typeof body?.metaTitle === "string" ? body.metaTitle.trim() : "";
  const metaDescription = typeof body?.metaDescription === "string" ? body.metaDescription.trim() : "";
  const isActive = Boolean(body?.isActive ?? true);

  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  if (!slug) return NextResponse.json({ ok: false, message: "Slug is required." }, { status: 400 });
  if (!content) return NextResponse.json({ ok: false, message: "Content is required." }, { status: 400 });

  try {
    const created = await prisma.customPage.create({
      data: {
        title,
        slug,
        content,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        isActive,
        isDisabled: false,
        createdAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id.toString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Create failed." }, { status: 400 });
  }
}

