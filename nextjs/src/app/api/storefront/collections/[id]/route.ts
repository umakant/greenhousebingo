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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.CATALOG_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await params;
  let cid: bigint;
  try {
    cid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const row = await prisma.storefrontCollection.findFirst({
      where: { id: cid, organizationId: org.organizationId },
      include: {
        products: { orderBy: { sortOrder: "asc" }, include: { product: { select: { id: true, name: true, slug: true } } } },
      },
    });
    if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      collection: {
        id: row.id.toString(),
        slug: row.slug,
        title: row.title,
        description: row.description,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        published: row.published,
        sortOrder: row.sortOrder,
        websiteId: row.websiteId?.toString() ?? null,
        productIds: row.products.map((p) => p.productId.toString()),
        products: row.products.map((p) => ({
          id: p.productId.toString(),
          name: p.product.name,
          slug: p.product.slug,
          sortOrder: p.sortOrder,
        })),
      },
    });
  } catch (e: unknown) {
    const schema = storefrontCatalogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.CATALOG_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await params;
  let cid: bigint;
  try {
    cid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const existing = await prisma.storefrontCollection.findFirst({
      where: { id: cid, organizationId: org.organizationId },
    });
    if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    let slug: string | undefined;
    if (body.slug != null) {
      slug = slugify(String(body.slug));
      const dup = await prisma.storefrontCollection.findFirst({
        where: { organizationId: org.organizationId, slug, NOT: { id: cid } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json({ ok: false, message: "A collection with this slug already exists." }, { status: 400 });
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

    await prisma.storefrontCollection.update({
      where: { id: cid },
      data: {
        ...(slug != null ? { slug } : {}),
        ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
        ...(body.description !== undefined ? { description: body.description != null ? String(body.description) : null } : {}),
        ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle != null ? String(body.seoTitle).slice(0, 512) : null } : {}),
        ...(body.seoDescription !== undefined
          ? { seoDescription: body.seoDescription != null ? String(body.seoDescription) : null }
          : {}),
        ...(body.published !== undefined ? { published: Boolean(body.published) } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: Math.max(0, Number(body.sortOrder) || 0) } : {}),
        ...(websiteId !== undefined ? { websiteId } : {}),
      },
    });

    if (Array.isArray(body.productIds)) {
      const ids = (body.productIds as unknown[])
        .map((x) => {
          try {
            return BigInt(String(x));
          } catch {
            return null;
          }
        })
        .filter((x): x is bigint => x != null);

      const valid = await prisma.posProduct.findMany({
        where: { organizationId: org.organizationId, id: { in: ids } },
        select: { id: true },
      });
      const validSet = new Set(valid.map((v) => v.id.toString()));

      await prisma.$transaction(async (tx) => {
        await tx.storefrontCollectionProduct.deleteMany({ where: { collectionId: cid } });
        let order = 0;
        for (const pid of ids) {
          if (!validSet.has(pid.toString())) continue;
          await tx.storefrontCollectionProduct.create({
            data: { collectionId: cid, productId: pid, sortOrder: order++ },
          });
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const schema = storefrontCatalogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.CATALOG_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await params;
  let cid: bigint;
  try {
    cid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  try {
    const existing = await prisma.storefrontCollection.findFirst({
      where: { id: cid, organizationId: org.organizationId },
    });
    if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

    await prisma.storefrontCollection.delete({ where: { id: cid } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const schema = storefrontCatalogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}
