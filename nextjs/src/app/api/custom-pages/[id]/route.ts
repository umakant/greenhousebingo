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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = requirePerm(req, "manage-custom-pages");
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const pageId = BigInt(id);
  const page = await prisma.customPage.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      metaTitle: true,
      metaDescription: true,
      isActive: true,
      isDisabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!page) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    page: {
      id: page.id.toString(),
      title: page.title,
      slug: page.slug,
      content: page.content,
      metaTitle: page.metaTitle ?? "",
      metaDescription: page.metaDescription ?? "",
      isActive: page.isActive,
      isDisabled: page.isDisabled,
      createdAt: page.createdAt.toISOString(),
      updatedAt: (page.updatedAt ?? page.createdAt).toISOString(),
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = requirePerm(req, "edit-custom-pages");
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const pageId = BigInt(id);

  const existing = await prisma.customPage.findUnique({ where: { id: pageId }, select: { id: true, isDisabled: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

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
    await prisma.customPage.update({
      where: { id: pageId },
      data: {
        title,
        slug,
        content,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        isActive,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Update failed." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = requirePerm(req, "delete-custom-pages");
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const pageId = BigInt(id);
  const existing = await prisma.customPage.findUnique({ where: { id: pageId }, select: { id: true, isDisabled: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  if (existing.isDisabled) return NextResponse.json({ ok: false, message: "This page cannot be deleted." }, { status: 400 });

  await prisma.customPage.delete({ where: { id: pageId } });
  return NextResponse.json({ ok: true });
}

