import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";
import { storefrontBlogSchemaErrorResponse } from "@/lib/storefront/storefront-catalog-schema-error";
import {
  getStorefrontBlogPostDelegate,
  STOREFRONT_BLOG_PRISMA_SETUP_MESSAGE,
} from "@/lib/storefront/storefront-blog-post-prisma";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "post";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.PAGE_MANAGE, STOREFRONT_PERMISSION.PUBLISH, STOREFRONT_PERMISSION.VIEW],
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let pid: bigint;
  try {
    pid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const blog = getStorefrontBlogPostDelegate();
  if (!blog) {
    return NextResponse.json({ ok: false, message: STOREFRONT_BLOG_PRISMA_SETUP_MESSAGE }, { status: 503 });
  }

  try {
    const row = await blog.findFirst({
      where: { id: pid, organizationId: org.organizationId },
    });
    if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      post: {
        id: row.id.toString(),
        websiteId: row.websiteId?.toString() ?? null,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        bodyHtml: row.bodyHtml,
        featuredImageUrl: row.featuredImageUrl,
        category: row.category,
        status: row.status,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        sortOrder: row.sortOrder,
        isFeaturedHome: row.isFeaturedHome,
      },
    });
  } catch (e: unknown) {
    const schema = storefrontBlogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.PAGE_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let pid: bigint;
  try {
    pid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const blog = getStorefrontBlogPostDelegate();
  if (!blog) {
    return NextResponse.json({ ok: false, message: STOREFRONT_BLOG_PRISMA_SETUP_MESSAGE }, { status: 503 });
  }

  try {
    const existing = await blog.findFirst({
      where: { id: pid, organizationId: org.organizationId },
    });
    if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    let slug: string | undefined;
    if (body.slug != null) {
      slug = slugify(String(body.slug));
      const dup = await blog.findFirst({
        where: { organizationId: org.organizationId, slug, NOT: { id: pid } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json({ ok: false, message: "A post with this slug already exists." }, { status: 400 });
      }
    }

    let websiteId: bigint | null | undefined;
    if (body.websiteId !== undefined) {
      if (body.websiteId == null || String(body.websiteId).trim() === "") websiteId = null;
      else {
        try {
          websiteId = BigInt(String(body.websiteId));
        } catch {
          websiteId = null;
        }
      }
    }

    let nextStatus: string | undefined;
    if (body.status !== undefined) {
      const s = String(body.status).toLowerCase();
      nextStatus = s === "published" || s === "archived" || s === "draft" ? s : undefined;
    }

    let publishedAt: Date | null | undefined;
    if (body.publishedAt !== undefined) {
      if (body.publishedAt == null || String(body.publishedAt).trim() === "") publishedAt = null;
      else publishedAt = new Date(String(body.publishedAt));
    }

    const prevStatus = existing.status;
    const mergedStatus = nextStatus ?? prevStatus;
    if (publishedAt === undefined && nextStatus === "published" && prevStatus !== "published") {
      publishedAt = new Date();
    }

    await blog.update({
      where: { id: pid },
      data: {
        ...(slug != null ? { slug } : {}),
        ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
        ...(body.excerpt !== undefined ? { excerpt: body.excerpt != null ? String(body.excerpt) : null } : {}),
        ...(body.bodyHtml !== undefined ? { bodyHtml: String(body.bodyHtml) } : {}),
        ...(body.featuredImageUrl !== undefined
          ? { featuredImageUrl: body.featuredImageUrl != null ? String(body.featuredImageUrl).trim() || null : null }
          : {}),
        ...(body.category !== undefined ? { category: body.category != null ? String(body.category).trim() || null : null } : {}),
        ...(nextStatus != null ? { status: nextStatus } : {}),
        ...(publishedAt !== undefined ? { publishedAt } : {}),
        ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle != null ? String(body.seoTitle).slice(0, 512) : null } : {}),
        ...(body.seoDescription !== undefined
          ? { seoDescription: body.seoDescription != null ? String(body.seoDescription) : null }
          : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: Math.max(0, Number(body.sortOrder) || 0) } : {}),
        ...(body.isFeaturedHome !== undefined ? { isFeaturedHome: Boolean(body.isFeaturedHome) } : {}),
        ...(websiteId !== undefined ? { websiteId } : {}),
        updatedById: org.userId,
      },
    });

    const publishAudit =
      nextStatus === "published" && prevStatus !== "published" ? STOREFRONT_AUDIT_EVENTS.BLOG_POST_PUBLISH : STOREFRONT_AUDIT_EVENTS.BLOG_POST_UPDATE;

    await logStorefrontAudit({
      organizationId: org.organizationId,
      websiteId: websiteId !== undefined ? websiteId : existing.websiteId,
      eventType: publishAudit,
      actorUserId: org.userId,
      resourceType: "storefront_blog_post",
      resourceId: pid.toString(),
      message: `Blog post updated: ${body.title != null ? String(body.title).trim() : existing.title}`,
      saas: saasActorFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const schema = storefrontBlogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.PAGE_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let pid: bigint;
  try {
    pid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const blog = getStorefrontBlogPostDelegate();
  if (!blog) {
    return NextResponse.json({ ok: false, message: STOREFRONT_BLOG_PRISMA_SETUP_MESSAGE }, { status: 503 });
  }

  try {
    const existing = await blog.findFirst({
      where: { id: pid, organizationId: org.organizationId },
    });
    if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    await blog.delete({ where: { id: pid } });

    await logStorefrontAudit({
      organizationId: org.organizationId,
      websiteId: existing.websiteId,
      eventType: STOREFRONT_AUDIT_EVENTS.BLOG_POST_DELETE,
      actorUserId: org.userId,
      resourceType: "storefront_blog_post",
      resourceId: pid.toString(),
      message: `Blog post deleted: ${existing.title}`,
      saas: saasActorFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const schema = storefrontBlogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}
