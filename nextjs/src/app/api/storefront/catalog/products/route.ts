import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { listCollectionIdsByProductIds, syncProductCollectionLinks } from "@/lib/pos/sync-product-collections";
import { storefrontCatalogSchemaErrorResponse } from "@/lib/storefront/storefront-catalog-schema-error";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import {
  optionalBrandId,
  optionalCategoryId,
  parseCollectionIds,
  parseGalleryUrls,
  parseInventoryPolicy,
  parseStorefrontHighlightsForDb,
  parseVariantsForCreate,
  slugify,
} from "@/lib/storefront/catalog-product-payload";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

type Tab = "all" | "active" | "draft" | "scheduled" | "archived";

function tabWhere(tab: string | null): Prisma.PosProductWhereInput {
  const t = (tab ?? "all") as Tab;
  const now = new Date();
  if (t === "active") {
    return {
      isActive: true,
      storefrontPublished: true,
      OR: [{ storefrontPublishAt: null }, { storefrontPublishAt: { lte: now } }],
    };
  }
  if (t === "scheduled") {
    return {
      isActive: true,
      storefrontPublished: true,
      storefrontPublishAt: { gt: now },
    };
  }
  if (t === "draft") return { isActive: true, storefrontPublished: false };
  if (t === "archived") return { isActive: false };
  return {};
}

function serializeProduct(r: {
  id: bigint;
  name: string;
  slug: string | null;
  sku: string | null;
  price: unknown;
  stock: number;
  isActive: boolean;
  storefrontPublished: boolean;
  storefrontPublishAt: Date | null;
  image: string | null;
  updatedAt: Date | null;
  pageTemplateKey: string | null;
  collections: { id: string; title: string }[];
}) {
  const price =
    r.price && typeof r.price === "object" && "toNumber" in r.price
      ? (r.price as { toNumber: () => number }).toNumber()
      : Number(r.price);
  return {
    id: r.id.toString(),
    name: r.name,
    slug: r.slug,
    sku: r.sku,
    price: Number.isFinite(price) ? price : 0,
    stock: r.stock,
    isActive: r.isActive,
    storefrontPublished: r.storefrontPublished,
    storefrontPublishAt: r.storefrontPublishAt?.toISOString() ?? null,
    image: r.image,
    updatedAt: r.updatedAt?.toISOString() ?? null,
    pageTemplateKey: r.pageTemplateKey ?? null,
    collections: r.collections,
  };
}

/** List POS catalog products for the storefront tenant (Shopify-style admin). */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.CATALOG_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const sp = req.nextUrl.searchParams;
  const tab = sp.get("tab");
  const q = sp.get("q")?.trim() ?? "";

  const searchWhere: Prisma.PosProductWhereInput =
    q.length > 0
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

  const where: Prisma.PosProductWhereInput = {
    organizationId: org.organizationId,
    AND: [tabWhere(tab), searchWhere],
  };

  try {
    const rows = await prisma.posProduct.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        stock: true,
        isActive: true,
        storefrontPublished: true,
        storefrontPublishAt: true,
        image: true,
        updatedAt: true,
        pageTemplateKey: true,
      },
    });

    const productIds = rows.map((r) => r.id);
    const linksByProduct = await listCollectionIdsByProductIds(productIds);
    const uniqCollectionIds = new Set<string>();
    for (const ids of linksByProduct.values()) {
      for (const cid of ids) uniqCollectionIds.add(cid);
    }
    const titleByCollectionId = new Map<string, string>();
    if (uniqCollectionIds.size > 0) {
      const idList = [...uniqCollectionIds].map((s) => BigInt(s));
      const cols = await prisma.storefrontCollection.findMany({
        where: { organizationId: org.organizationId, id: { in: idList } },
        select: { id: true, title: true },
      });
      for (const c of cols) {
        titleByCollectionId.set(c.id.toString(), c.title);
      }
    }

    const data = rows.map((r) => {
      const cids = linksByProduct.get(r.id.toString()) ?? [];
      const collections = cids.map((id) => ({
        id,
        title: titleByCollectionId.get(id) ?? "—",
      }));
      return serializeProduct({ ...r, collections });
    });

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (e: unknown) {
    const schema = storefrontCatalogSchemaErrorResponse(e);
    if (schema) return schema;
    throw e;
  }
}

/** Create a catalog product (Shopify-style fields supported where the schema allows). */
export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.CATALOG_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });

  const variantParse = parseVariantsForCreate(body);
  if (!variantParse.ok) {
    return NextResponse.json({ ok: false, message: variantParse.message }, { status: 400 });
  }

  let priceNum: number;
  let stockNum: number;
  let variantsValue: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;

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
    variantsValue = undefined;
  }

  const slugRaw = body.slug != null ? String(body.slug).trim() : "";
  const slug = slugify(slugRaw || name);

  const dup = await prisma.posProduct.findFirst({
    where: { organizationId: org.organizationId, slug },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ ok: false, message: "A product with this slug already exists." }, { status: 400 });
  }

  const compareRaw = body.compareAtPrice;
  const compareAtPrice =
    compareRaw != null && compareRaw !== "" && Number.isFinite(Number(compareRaw)) ? Number(compareRaw) : null;

  const galleryUrls = parseGalleryUrls(body.galleryImages);
  const galleryJson =
    galleryUrls && galleryUrls.length > 0 ? (galleryUrls as Prisma.InputJsonValue) : undefined;

  const imageExplicit = body.image != null ? String(body.image).trim() : "";
  const image =
    imageExplicit ||
    (galleryUrls && galleryUrls.length > 0 ? galleryUrls[0]! : null) ||
    null;

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

  const row = await prisma.posProduct.create({
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
      unitId: null,
      taxId: null,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      organizationId: org.organizationId,
      slug,
      compareAtPrice,
      storefrontPublished,
      storefrontPublishAt,
      storefrontSeoTitle:
        body.storefrontSeoTitle != null && String(body.storefrontSeoTitle).trim()
          ? String(body.storefrontSeoTitle).trim().slice(0, 512)
          : null,
      storefrontSeoDescription:
        body.storefrontSeoDescription != null && String(body.storefrontSeoDescription).trim()
          ? String(body.storefrontSeoDescription).trim()
          : null,
      galleryImages: galleryJson === undefined ? undefined : galleryJson,
      relatedProductIds: undefined,
      pageTemplateKey:
        body.pageTemplateKey != null && String(body.pageTemplateKey).trim()
          ? String(body.pageTemplateKey).trim().slice(0, 64)
          : "product",
      variants: variantsValue === undefined ? undefined : variantsValue,
      image,
      inventoryPolicy: parseInventoryPolicy(body.inventoryPolicy),
      storefrontFeatured: Boolean(body.storefrontFeatured),
      ...(body.storefrontHighlights !== undefined
        ? {
            storefrontHighlights:
              body.storefrontHighlights === null
                ? Prisma.JsonNull
                : parseStorefrontHighlightsForDb(body.storefrontHighlights),
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      stock: true,
      isActive: true,
      storefrontPublished: true,
      storefrontPublishAt: true,
      image: true,
      updatedAt: true,
      pageTemplateKey: true,
    },
  });

  if (collectionIds.length > 0) {
    await syncProductCollectionLinks(row.id, org.organizationId, collectionIds);
  }

  let collections: { id: string; title: string }[] = [];
  if (collectionIds.length > 0) {
    const cols = await prisma.storefrontCollection.findMany({
      where: { organizationId: org.organizationId, id: { in: collectionIds } },
      select: { id: true, title: true },
    });
    const titleMap = new Map(cols.map((c) => [c.id.toString(), c.title]));
    collections = collectionIds.map((cid) => ({
      id: cid.toString(),
      title: titleMap.get(cid.toString()) ?? "—",
    }));
  }

  return NextResponse.json({ ok: true, data: serializeProduct({ ...row, collections }) }, { status: 201 });
}
