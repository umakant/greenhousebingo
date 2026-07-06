import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";
import { storefrontBlogSchemaErrorResponse } from "@/lib/storefront/storefront-catalog-schema-error";
import {
  getStorefrontBlogPostDelegate,
  STOREFRONT_BLOG_PRISMA_SETUP_MESSAGE,
} from "@/lib/storefront/storefront-blog-post-prisma";

export const dynamic = "force-dynamic";

/** Row shape from `storefrontBlogPost.findMany` (explicit so builds work before `prisma generate`). */
type BlogPostListRow = {
  id: bigint;
  websiteId: bigint | null;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  featuredImageUrl: string | null;
  category: string | null;
  status: string;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  isFeaturedHome: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "post";
}

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.PAGE_MANAGE, STOREFRONT_PERMISSION.PUBLISH, STOREFRONT_PERMISSION.VIEW],
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const wid = req.nextUrl.searchParams.get("websiteId")?.trim();
  let websiteFilter: bigint | undefined;
  if (wid && /^\d+$/.test(wid)) {
    try {
      websiteFilter = BigInt(wid);
    } catch {
      websiteFilter = undefined;
    }
  }

  const blog = getStorefrontBlogPostDelegate();
  if (!blog) {
    return NextResponse.json({
      ok: true,
      posts: [],
      storefrontNotice: STOREFRONT_BLOG_PRISMA_SETUP_MESSAGE,
    });
  }

  try {
    const rows = (await blog.findMany({
      where: {
        organizationId: org.organizationId,
        ...(websiteFilter != null ? { websiteId: websiteFilter } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    })) as BlogPostListRow[];

    return NextResponse.json({
      ok: true,
      posts: rows.map((r) => ({
        id: r.id.toString(),
        websiteId: r.websiteId?.toString() ?? null,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        bodyHtml: r.bodyHtml,
        featuredImageUrl: r.featuredImageUrl,
        category: r.category,
        status: r.status,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        seoTitle: r.seoTitle,
        seoDescription: r.seoDescription,
        sortOrder: r.sortOrder,
        isFeaturedHome: r.isFeaturedHome,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt?.toISOString() ?? null,
      })),
    });
  } catch (e: unknown) {
    const schema = storefrontBlogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.PAGE_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  const slugRaw = String(body.slug ?? "").trim();
  const slug = slugify(slugRaw || title);

  let websiteId: bigint | null = null;
  if (body.websiteId != null && String(body.websiteId).trim() !== "") {
    try {
      websiteId = BigInt(String(body.websiteId));
    } catch {
      websiteId = null;
    }
  }

  const blog = getStorefrontBlogPostDelegate();
  if (!blog) {
    return NextResponse.json({ ok: false, message: STOREFRONT_BLOG_PRISMA_SETUP_MESSAGE }, { status: 503 });
  }

  try {
    const dup = await blog.findFirst({
      where: { organizationId: org.organizationId, slug },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ ok: false, message: "A post with this slug already exists." }, { status: 400 });
    }

    const status = String(body.status ?? "draft").toLowerCase();
    const normalizedStatus = status === "published" || status === "archived" ? status : "draft";
    const publishedAt =
      normalizedStatus === "published"
        ? body.publishedAt != null && String(body.publishedAt).trim()
          ? new Date(String(body.publishedAt))
          : new Date()
        : null;

    const row = await blog.create({
      data: {
        organizationId: org.organizationId,
        websiteId,
        slug,
        title,
        excerpt: body.excerpt != null ? String(body.excerpt) : null,
        bodyHtml: body.bodyHtml != null ? String(body.bodyHtml) : "",
        featuredImageUrl: body.featuredImageUrl != null ? String(body.featuredImageUrl).trim() || null : null,
        category: body.category != null ? String(body.category).trim() || null : null,
        status: normalizedStatus,
        publishedAt,
        seoTitle: body.seoTitle != null ? String(body.seoTitle).slice(0, 512) : null,
        seoDescription: body.seoDescription != null ? String(body.seoDescription) : null,
        sortOrder: Math.max(0, Number(body.sortOrder) || 0),
        isFeaturedHome: Boolean(body.isFeaturedHome),
        createdById: org.userId,
        updatedById: org.userId,
      },
    });

    await logStorefrontAudit({
      organizationId: org.organizationId,
      websiteId,
      eventType: STOREFRONT_AUDIT_EVENTS.BLOG_POST_CREATE,
      actorUserId: org.userId,
      resourceType: "storefront_blog_post",
      resourceId: row.id.toString(),
      message: `Blog post created: ${title}`,
      metadata: { slug },
      saas: saasActorFromRequest(req),
    });

    return NextResponse.json({ ok: true, id: row.id.toString() }, { status: 201 });
  } catch (e: unknown) {
    const schema = storefrontBlogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}
