import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { listCollectionIdsForProduct, syncProductCollectionLinks } from "@/lib/pos/sync-product-collections";
import {
  jsonValueForHttpResponse,
  optionalBrandId,
  optionalCategoryId,
  parseCollectionIds,
  parseGalleryUrls,
  parseInventoryPolicy,
  parseStorefrontHighlightsForDb,
  parseVariantsForCreate,
  slugify,
} from "@/lib/storefront/catalog-product-payload";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

function numDecimal(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && v !== null && "toNumber" in v && typeof (v as { toNumber: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function galleryToStringArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

/** Single product for storefront catalog admin (edit form). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.CATALOG_MANAGE });
    if (denied) return denied;
    const org = await requireStorefrontOrganization(req);
    if (!org.ok) return org.response;

    const { id } = await params;
    let bid: bigint;
    try {
      bid = BigInt(id);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid product id." }, { status: 400 });
    }

    const row = await prisma.posProduct.findFirst({
      where: { id: bid, organizationId: org.organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        sku: true,
        barcode: true,
        price: true,
        compareAtPrice: true,
        cost: true,
        stock: true,
        stockAlert: true,
        categoryId: true,
        brandId: true,
        image: true,
        galleryImages: true,
        isActive: true,
        storefrontPublished: true,
        storefrontPublishAt: true,
        storefrontSeoTitle: true,
        storefrontSeoDescription: true,
        inventoryPolicy: true,
        variants: true,
        storefrontFeatured: true,
        storefrontHighlights: true,
      },
    });
    if (!row) {
      return NextResponse.json({ ok: false, message: "Product not found." }, { status: 404 });
    }

    const collectionIds = await listCollectionIdsForProduct(bid);
    const cmp = row.compareAtPrice != null ? numDecimal(row.compareAtPrice) : null;

    return NextResponse.json({
      ok: true,
      data: {
        id: row.id.toString(),
        name: row.name,
        description: row.description ?? null,
        slug: row.slug,
        sku: row.sku,
        barcode: row.barcode,
        price: numDecimal(row.price),
        compareAtPrice: cmp,
        cost: numDecimal(row.cost),
        stock: row.stock,
        stockAlert: row.stockAlert,
        categoryId: row.categoryId?.toString() ?? null,
        brandId: row.brandId?.toString() ?? null,
        image: row.image,
        galleryImages: galleryToStringArray(row.galleryImages),
        isActive: row.isActive,
        storefrontPublished: row.storefrontPublished,
        storefrontPublishAt: row.storefrontPublishAt?.toISOString() ?? null,
        storefrontSeoTitle: row.storefrontSeoTitle,
        storefrontSeoDescription: row.storefrontSeoDescription,
        inventoryPolicy: row.inventoryPolicy ?? "track",
        variants: jsonValueForHttpResponse(row.variants),
        collectionIds,
        storefrontFeatured: row.storefrontFeatured,
        storefrontHighlights: jsonValueForHttpResponse(row.storefrontHighlights),
      },
    });
  } catch (e) {
    console.error("[storefront/catalog/products/:id] GET failed:", e);
    const message = e instanceof Error ? e.message : "Failed to load product.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

type OrgOk = { ok: true; userId: bigint; organizationId: bigint };

async function patchFullCatalogBody(
  bid: bigint,
  org: OrgOk,
  body: Record<string, unknown>,
  existingPublished: boolean,
  req: NextRequest,
  existingSlug: string | null,
): Promise<NextResponse> {
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });

  const variantParse = parseVariantsForCreate(body);
  if (!variantParse.ok) {
    return NextResponse.json({ ok: false, message: variantParse.message }, { status: 400 });
  }

  let priceNum: number;
  let stockNum: number;
  let variantsValue: Prisma.InputJsonValue | typeof Prisma.JsonNull;

  if (variantParse.hasVariants) {
    priceNum = variantParse.price;
    stockNum = variantParse.stock;
    variantsValue = variantParse.variants;
  } else {
    if (body.price == null || body.price === "") {
      return NextResponse.json({ ok: false, message: "Price is required." }, { status: 400 });
    }
    priceNum = Number(body.price);
    stockNum = body.stock != null && body.stock !== "" ? Math.max(0, Math.floor(Number(body.stock))) : 0;
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ ok: false, message: "Invalid price." }, { status: 400 });
    }
    variantsValue = Prisma.JsonNull;
  }

  // Preserve the product's existing slug on edit; only change it when the client
  // explicitly sends a non-empty slug. Renaming a product must not alter its URL.
  const slugRaw = body.slug != null ? String(body.slug).trim() : "";
  const slugFinal = slugRaw ? slugify(slugRaw) : existingSlug || slugify(name);

  const dup = await prisma.posProduct.findFirst({
    where: { organizationId: org.organizationId, slug: slugFinal, NOT: { id: bid } },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ ok: false, message: "A product with this slug already exists." }, { status: 400 });
  }

  const compareRaw = body.compareAtPrice;
  const compareAtPrice =
    compareRaw != null && compareRaw !== "" && Number.isFinite(Number(compareRaw)) ? Number(compareRaw) : null;

  /** Omit `galleryImages` from the JSON body to leave existing gallery rows unchanged (admin UI may hide gallery). */
  const galleryExplicit = body.galleryImages !== undefined;
  const galleryUrls = parseGalleryUrls(body.galleryImages);
  const galleryJson: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined = galleryExplicit
    ? galleryUrls && galleryUrls.length > 0
      ? (galleryUrls as Prisma.InputJsonValue)
      : Prisma.JsonNull
    : undefined;

  const imageExplicit = body.image != null ? String(body.image).trim() : "";
  const image = galleryExplicit
    ? imageExplicit || (galleryUrls && galleryUrls.length > 0 ? galleryUrls[0]! : null) || null
    : imageExplicit.length > 0
      ? imageExplicit
      : null;

  const collectionIds = parseCollectionIds(body);
  const categoryId = await optionalCategoryId(body.categoryId);
  const brandId = await optionalBrandId(body.brandId);

  const cost =
    body.cost != null && body.cost !== "" && Number.isFinite(Number(body.cost)) ? Number(body.cost) : 0;
  const stockAlert =
    body.stockAlert != null && body.stockAlert !== "" && Number.isFinite(Number(body.stockAlert))
      ? Math.max(0, Math.floor(Number(body.stockAlert)))
      : 5;

  const storefrontPublished = Boolean(body.storefrontPublished);
  let storefrontPublishAt: Date | null = null;
  if (storefrontPublished && body.storefrontPublishAt != null && String(body.storefrontPublishAt).trim()) {
    const d = new Date(String(body.storefrontPublishAt));
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
      storefrontPublishAt = d;
    }
  }

  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
  const storefrontFeatured =
    body.storefrontFeatured !== undefined ? Boolean(body.storefrontFeatured) : false;

  const saas = saasActorFromRequest(req);
  if (storefrontPublished !== existingPublished) {
    await logStorefrontAudit({
      organizationId: org.organizationId,
      eventType: storefrontPublished ? STOREFRONT_AUDIT_EVENTS.PRODUCT_PUBLISH : STOREFRONT_AUDIT_EVENTS.PRODUCT_UNPUBLISH,
      actorUserId: org.userId,
      resourceType: "pos_product",
      resourceId: bid.toString(),
      message: storefrontPublished ? "Product published to storefront." : "Product removed from storefront.",
      saas,
    });
  }

  await prisma.posProduct.update({
    where: { id: bid },
    data: {
      name,
      description: body.description != null ? String(body.description) : null,
      barcode: body.barcode != null && String(body.barcode).trim() ? String(body.barcode).trim() : null,
      sku: body.sku != null && String(body.sku).trim() ? String(body.sku).trim() : null,
      price: priceNum,
      cost,
      stock: stockNum,
      stockAlert,
      categoryId,
      brandId,
      slug: slugFinal,
      compareAtPrice,
      storefrontPublished,
      storefrontPublishAt: storefrontPublished ? storefrontPublishAt : null,
      isActive,
      storefrontSeoTitle:
        body.storefrontSeoTitle != null && String(body.storefrontSeoTitle).trim()
          ? String(body.storefrontSeoTitle).trim().slice(0, 512)
          : null,
      storefrontSeoDescription:
        body.storefrontSeoDescription != null && String(body.storefrontSeoDescription).trim()
          ? String(body.storefrontSeoDescription).trim()
          : null,
      ...(galleryJson !== undefined ? { galleryImages: galleryJson } : {}),
      variants: variantsValue,
      image,
      inventoryPolicy: parseInventoryPolicy(body.inventoryPolicy),
      storefrontFeatured,
      ...(body.storefrontHighlights !== undefined
        ? {
            storefrontHighlights:
              body.storefrontHighlights === null
                ? Prisma.JsonNull
                : parseStorefrontHighlightsForDb(body.storefrontHighlights),
          }
        : {}),
    },
  });

  await syncProductCollectionLinks(bid, org.organizationId, collectionIds);

  return NextResponse.json({ ok: true });
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
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid product id." }, { status: 400 });
  }

  const existing = await prisma.posProduct.findFirst({
    where: { id: bid, organizationId: org.organizationId },
    select: {
      id: true,
      slug: true,
      storefrontPublished: true,
      isActive: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Product not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if ("collectionIds" in body) {
    return patchFullCatalogBody(bid, org, body, existing.storefrontPublished, req, existing.slug);
  }

  const data: Prisma.PosProductUpdateInput = {};

  if (body.storefrontPublished !== undefined) {
    data.storefrontPublished = Boolean(body.storefrontPublished);
    if (!data.storefrontPublished) data.storefrontPublishAt = null;
  }
  if (body.storefrontPublishAt !== undefined) {
    if (body.storefrontPublishAt === null || body.storefrontPublishAt === "") {
      data.storefrontPublishAt = null;
    } else {
      const d = new Date(String(body.storefrontPublishAt));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, message: "Invalid scheduled publish time." }, { status: 400 });
      }
      data.storefrontPublishAt = d.getTime() <= Date.now() ? null : d;
    }
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.storefrontFeatured !== undefined) data.storefrontFeatured = Boolean(body.storefrontFeatured);
  if (body.storefrontHighlights !== undefined) {
    data.storefrontHighlights =
      body.storefrontHighlights === null
        ? Prisma.JsonNull
        : parseStorefrontHighlightsForDb(body.storefrontHighlights);
  }
  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return NextResponse.json({ ok: false, message: "Name cannot be empty." }, { status: 400 });
    data.name = n;
  }
  if (body.slug !== undefined) {
    const s = String(body.slug).trim();
    data.slug = s.length ? s : null;
  }
  if (body.sku !== undefined) {
    const s = body.sku == null ? null : String(body.sku).trim();
    data.sku = s && s.length ? s : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, message: "No valid fields to update." }, { status: 400 });
  }

  const saas = saasActorFromRequest(req);

  if (data.storefrontPublished !== undefined && data.storefrontPublished !== existing.storefrontPublished) {
    await logStorefrontAudit({
      organizationId: org.organizationId,
      eventType: data.storefrontPublished ? STOREFRONT_AUDIT_EVENTS.PRODUCT_PUBLISH : STOREFRONT_AUDIT_EVENTS.PRODUCT_UNPUBLISH,
      actorUserId: org.userId,
      resourceType: "pos_product",
      resourceId: bid.toString(),
      message: data.storefrontPublished ? "Product published to storefront." : "Product removed from storefront.",
      saas,
    });
  }

  await prisma.posProduct.update({
    where: { id: bid },
    data,
  });

  return NextResponse.json({ ok: true });
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
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid product id." }, { status: 400 });
  }

  const existing = await prisma.posProduct.findFirst({
    where: { id: bid, organizationId: org.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Product not found." }, { status: 404 });
  }

  const saas = saasActorFromRequest(req);
  await logStorefrontAudit({
    organizationId: org.organizationId,
    eventType: STOREFRONT_AUDIT_EVENTS.PRODUCT_DELETE,
    actorUserId: org.userId,
    resourceType: "pos_product",
    resourceId: bid.toString(),
    message: `Product deleted: ${existing.name}`,
    saas,
  });

  await prisma.posProduct.delete({ where: { id: bid } });

  return NextResponse.json({ ok: true });
}
