import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSettingsForOwner, upsertOwnerSettings } from "@/lib/settings-service";
import { storefrontProductPublicLiveWhere } from "@/lib/storefront/storefront-product-public-visibility";

function isPrismaPublicCatalogSchemaMissing(e: unknown): boolean {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = String((e as { code?: unknown }).code);
    if (code === "P2021" || code === "P2022") return true;
  }
  if (e instanceof Error) {
    return e.message.includes("does not exist in the current database");
  }
  return false;
}

/** Persisted JSON array of POS product ids (strings), ordered for the bundle builder grid. */
export const SF_BUNDLE_PRODUCT_IDS_KEY = "sf_bundle_product_ids";

function parseGallery(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
  return [];
}

function storefrontProductPrimaryImageUrl(image: string | null, galleryRaw: unknown): string | null {
  const trimmed = image?.trim();
  if (trimmed) return trimmed;
  const g = parseGallery(galleryRaw);
  const first = g[0]?.trim();
  return first || null;
}

export function parseBundleProductIdList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of j) {
      const s = String(x ?? "").trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  } catch {
    return [];
  }
}

export async function getBundleProductIdsForOrganization(organizationId: bigint): Promise<string[]> {
  const settings = await getSettingsForOwner(organizationId);
  return parseBundleProductIdList(settings[SF_BUNDLE_PRODUCT_IDS_KEY]);
}

export async function setBundleProductIdsForOrganization(organizationId: bigint, ids: string[]): Promise<void> {
  const seen = new Set<string>();
  const norm: string[] = [];
  for (const id of ids) {
    const s = String(id ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    norm.push(s);
  }
  await upsertOwnerSettings(organizationId, [
    { key: SF_BUNDLE_PRODUCT_IDS_KEY, value: JSON.stringify(norm), isPublic: true },
  ]);
}

export type VariantRow = { id?: string; name?: string; price?: number; stock?: number };

/**
 * Parses POS `PosProduct.variants` JSON array for storefront hydrators.
 * Omits `stock` on a row when the merchant did not set per-variant inventory (use parent `pos_products.stock`).
 */
export function parsePosProductVariants(raw: unknown): VariantRow[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  const out: VariantRow[] = [];
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const id = o.id != null ? String(o.id).trim() : o.sku != null ? String(o.sku).trim() : "";
    const nameFromName = o.name != null ? String(o.name).trim() : "";
    const nameFromTitle = o.title != null ? String(o.title).trim() : "";
    const name = nameFromName || nameFromTitle || id;
    const price = typeof o.price === "number" ? o.price : Number(o.price);
    if (!id) continue;
    const row: VariantRow = {
      id,
      name,
      price: Number.isFinite(price) ? price : 0,
    };
    if (o.stock !== undefined && o.stock !== null && o.stock !== "") {
      const sn = typeof o.stock === "number" ? o.stock : Number(o.stock);
      if (Number.isFinite(sn)) row.stock = sn;
    }
    out.push(row);
  }
  return out;
}

/** Same rule as `resolveVariantStock` in cart-service: explicit per-variant stock, else parent SKU stock. */
export function effectiveVariantStockUnits(variant: VariantRow, parentStock: number): number {
  if (variant.stock !== undefined && Number.isFinite(variant.stock)) return variant.stock;
  return parentStock;
}

/** Shopify-theme-shaped variant JSON for `data-selected-variant` / `data-variants` script tags (see theme `ProductBundleForm`). */
export function shopifyLikeVariantJson(params: {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  priceDollars: number;
  imageUrl: string | null;
  /** When false, variant is sold out for theme pickers / bundle UI. */
  available?: boolean;
}): Record<string, unknown> {
  const cents = Math.max(0, Math.round(params.priceDollars * 100));
  const img = params.imageUrl?.trim() || "";
  const preview = img
    ? {
        alt: params.variantName,
        id: 1,
        position: 1,
        preview_image: { aspect_ratio: 1, height: 1000, width: 1000, src: img },
      }
    : null;

  /** Concept bundle cards resolve `<img>` URLs from `featured_image.src`; `null` made the theme set `src` to `#`. */
  const featured_image = img
    ? ({
        id: 1,
        product_id: /^\d+$/.test(params.productId) ? Number(params.productId) : params.productId,
        position: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        alt: params.variantName,
        width: 2000,
        height: 2000,
        src: img,
        variant_ids: [params.variantId],
      } satisfies Record<string, unknown>)
    : null;

  return {
    id: params.variantId,
    title: params.variantName,
    option1: params.variantName,
    option2: null,
    option3: null,
    sku: "",
    requires_shipping: true,
    taxable: true,
    featured_image,
    available: params.available !== false,
    name: `${params.productName} — ${params.variantName}`,
    public_title: params.variantName,
    options: [params.variantName],
    price: cents,
    weight: 0,
    compare_at_price: null,
    inventory_management: "paperflight",
    barcode: "",
    featured_media: preview,
    requires_selling_plan: false,
    selling_plan_allocations: [],
    default_featured_media: img,
  };
}

export type PublicBundleCatalogProduct = {
  id: string;
  name: string;
  slug: string | null;
  image: string | null;
  price: number;
  compareAtPrice: number | null;
  variants: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    themeJson: Record<string, unknown>;
  }>;
};

function rowToPublicBundleProduct(r: {
  id: bigint;
  name: string;
  slug: string | null;
  stock: number;
  price: unknown;
  compareAtPrice: unknown;
  image: string | null;
  galleryImages: unknown;
  variants: unknown;
}): PublicBundleCatalogProduct {
  const basePrice =
    r.price && typeof r.price === "object" && "toNumber" in r.price
      ? (r.price as { toNumber: () => number }).toNumber()
      : Number(r.price);
  const price = Number.isFinite(basePrice) ? basePrice : 0;
  const cmpRaw =
    r.compareAtPrice && typeof r.compareAtPrice === "object" && "toNumber" in r.compareAtPrice
      ? (r.compareAtPrice as { toNumber: () => number }).toNumber()
      : r.compareAtPrice != null
        ? Number(r.compareAtPrice)
        : null;
  const compareAtPrice = cmpRaw != null && Number.isFinite(cmpRaw) ? cmpRaw : null;

  const primaryImage = storefrontProductPrimaryImageUrl(r.image, r.galleryImages);
  const parsed = parsePosProductVariants(r.variants);
  const variants =
    parsed.length > 0
      ? parsed.map((v) => {
          const effStock = effectiveVariantStockUnits(v, r.stock);
          return {
            id: v.id!,
            name: v.name!,
            price: v.price ?? price,
            stock: effStock,
            themeJson: shopifyLikeVariantJson({
              variantId: v.id!,
              productId: r.id.toString(),
              productName: r.name,
              variantName: v.name!,
              priceDollars: v.price ?? price,
              imageUrl: primaryImage,
              available: effStock > 0,
            }),
          };
        })
      : [
          {
            id: "__base",
            name: "Default",
            price,
            stock: r.stock,
            themeJson: shopifyLikeVariantJson({
              variantId: "__base",
              productId: r.id.toString(),
              productName: r.name,
              variantName: "Default",
              priceDollars: price,
              imageUrl: primaryImage,
              available: r.stock > 0,
            }),
          },
        ];

  return {
    id: r.id.toString(),
    name: r.name,
    slug: r.slug,
    image: primaryImage,
    price,
    compareAtPrice,
    variants,
  };
}

/** When merchants have not curated a bundle list, show featured/newest live catalog items so the theme grid is not stuck on static demo HTML. */
async function listDefaultPublicBundleCatalogProducts(
  organizationId: bigint,
  take = 12,
): Promise<PublicBundleCatalogProduct[]> {
  try {
    const liveWhere = storefrontProductPublicLiveWhere();
    const n = Math.min(24, Math.max(1, take));
    const rows = await prisma.posProduct.findMany({
      where: {
        organizationId,
        slug: { not: null },
        ...liveWhere,
      },
      orderBy: [{ storefrontFeatured: "desc" as const }, { updatedAt: "desc" as const }],
      take: n,
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        price: true,
        compareAtPrice: true,
        image: true,
        galleryImages: true,
        variants: true,
      },
    });
    return rows.map((r) => rowToPublicBundleProduct(r));
  } catch (e) {
    if (isPrismaPublicCatalogSchemaMissing(e)) {
      console.warn(
        "[storefront] listDefaultPublicBundleCatalogProducts: DB schema mismatch — run `npx prisma migrate deploy` in `nextjs/`.",
      );
      return [];
    }
    throw e;
  }
}

/**
 * Ordered bundle products for the public theme hydrator (only ids published & live are returned).
 * If no bundle ids are saved in Settings, falls back to the newest/featured live catalog (same idea as the Concept home grid).
 */
export async function listPublicBundleCatalogProducts(params: {
  organizationId: bigint;
  /** Reserved for future website-scoped bundles (same catalog today). */
  websiteId?: bigint;
}): Promise<PublicBundleCatalogProduct[]> {
  try {
    const ids = await getBundleProductIdsForOrganization(params.organizationId);

    if (ids.length === 0) {
      return listDefaultPublicBundleCatalogProducts(params.organizationId);
    }

    let bid: bigint[];
    try {
      bid = ids.map((s) => BigInt(s));
    } catch {
      return listDefaultPublicBundleCatalogProducts(params.organizationId);
    }

    const liveWhere = storefrontProductPublicLiveWhere();
    const where: Prisma.PosProductWhereInput = {
      organizationId: params.organizationId,
      id: { in: bid },
      slug: { not: null },
      ...liveWhere,
    };

    const rows = await prisma.posProduct.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        price: true,
        compareAtPrice: true,
        image: true,
        galleryImages: true,
        variants: true,
      },
    });

    const byId = new Map(rows.map((r) => [r.id.toString(), r]));
    const ordered: PublicBundleCatalogProduct[] = [];
    for (const sid of ids) {
      const row = byId.get(sid);
      if (!row) continue;
      ordered.push(rowToPublicBundleProduct(row));
    }

    if (ordered.length === 0) {
      return listDefaultPublicBundleCatalogProducts(params.organizationId);
    }

    return ordered;
  } catch (e) {
    if (isPrismaPublicCatalogSchemaMissing(e)) {
      console.warn(
        "[storefront] listPublicBundleCatalogProducts: DB schema mismatch — run `npx prisma migrate deploy` in `nextjs/`.",
      );
      return [];
    }
    throw e;
  }
}

/** Validates ids belong to org; returns normalized unique list (caller may merge). */
export async function validateProductIdsForOrganization(
  organizationId: bigint,
  ids: string[],
): Promise<{ ok: true; normalized: string[] } | { ok: false; invalid: string[] }> {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const s = String(id ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    normalized.push(s);
  }
  if (normalized.length === 0) return { ok: true, normalized: [] };

  let bids: bigint[];
  try {
    bids = normalized.map((s) => BigInt(s));
  } catch {
    return { ok: false, invalid: normalized };
  }

  const found = await prisma.posProduct.findMany({
    where: { organizationId, id: { in: bids } },
    select: { id: true },
  });
  const foundSet = new Set(found.map((r) => r.id.toString()));
  const invalid = normalized.filter((id) => !foundSet.has(id));
  if (invalid.length > 0) return { ok: false, invalid };
  return { ok: true, normalized };
}
