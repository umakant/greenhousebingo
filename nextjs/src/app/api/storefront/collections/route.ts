import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { storefrontCatalogSchemaErrorResponse } from "@/lib/storefront/storefront-catalog-schema-error";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "collection";
}

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.CATALOG_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  try {
    const rows = await prisma.storefrontCollection.findMany({
      where: { organizationId: org.organizationId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      collections: rows.map((r) => ({
        id: r.id.toString(),
        slug: r.slug,
        title: r.title,
        description: r.description,
        seoTitle: r.seoTitle,
        seoDescription: r.seoDescription,
        published: r.published,
        sortOrder: r.sortOrder,
        websiteId: r.websiteId?.toString() ?? null,
        productCount: r._count.products,
      })),
    });
  } catch (e: unknown) {
    const schema = storefrontCatalogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.CATALOG_MANAGE,
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

  try {
    const dup = await prisma.storefrontCollection.findFirst({
      where: { organizationId: org.organizationId, slug },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ ok: false, message: "A collection with this slug already exists." }, { status: 400 });
    }

    let websiteId: bigint | null = null;
    if (body.websiteId != null && String(body.websiteId).trim() !== "") {
      try {
        websiteId = BigInt(String(body.websiteId));
      } catch {
        websiteId = null;
      }
    }

    const row = await prisma.storefrontCollection.create({
      data: {
        organizationId: org.organizationId,
        websiteId,
        slug,
        title,
        description: body.description != null ? String(body.description) : null,
        seoTitle: body.seoTitle != null ? String(body.seoTitle).slice(0, 512) : null,
        seoDescription: body.seoDescription != null ? String(body.seoDescription) : null,
        published: Boolean(body.published),
        sortOrder: Math.max(0, Number(body.sortOrder) || 0),
      },
    });

    return NextResponse.json({ ok: true, id: row.id.toString() }, { status: 201 });
  } catch (e: unknown) {
    const schema = storefrontCatalogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}
