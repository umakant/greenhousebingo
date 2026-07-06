import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getStorefrontBlogPostDelegate } from "@/lib/storefront/storefront-blog-post-prisma";
import { storefrontProductPublicLiveWhere } from "@/lib/storefront/storefront-product-public-visibility";

/** Tables/columns for storefront collections not applied yet (`npx prisma migrate deploy`). */
function isStorefrontCollectionsSchemaMissing(e: unknown): boolean {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = String((e as { code?: unknown }).code);
    if (code === "P2021" || code === "P2022") return true;
  }
  if (e instanceof Error) {
    const m = e.message;
    if (!m.includes("does not exist in the current database")) return false;
    return (
      m.includes("storefront_collections") ||
      m.includes("storefront_collection_products") ||
      m.includes("storefrontCollection")
    );
  }
  return false;
}

export type PublicStorefrontHighlight = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
};

export type PublicCatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  stockAlert: number;
  /** `track` | `continue` | `deny` — matches POS `inventory_policy`; `continue` sells when stock is 0. */
  inventoryPolicy: string;
  image: string | null;
  galleryImages: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  categoryName: string | null;
  brandName: string | null;
  variants: unknown;
  /** Concept homepage featured spotlight + PDP — from `pos_products.storefront_highlights`. */
  storefrontHighlights: PublicStorefrontHighlight[] | null;
  storefrontHighlightsHeading: string | null;
  related: Array<{
    id: string;
    name: string;
    slug: string | null;
    price: number;
    image: string | null;
  }>;
};

/** Deep-clone JSON so Prisma `Json` / RSC → client serialization never hits non-JSON values (e.g. odd proxies). */
function jsonCloneForClient(value: unknown): unknown | null {
  if (value == null) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return null;
  }
}

function parseStorefrontHighlightsPublic(raw: unknown): {
  heading: string | null;
  items: PublicStorefrontHighlight[] | null;
} {
  if (raw == null) return { heading: null, items: null };
  const toItem = (cell: unknown): PublicStorefrontHighlight | null => {
    if (!cell || typeof cell !== "object") return null;
    const r = cell as Record<string, unknown>;
    const title = String(r.title ?? "").trim().slice(0, 120);
    if (!title) return null;
    const subtitle = String(r.subtitle ?? "").trim().slice(0, 200);
    const imageUrl = String(r.imageUrl ?? "").trim().slice(0, 2048);
    return {
      title,
      ...(subtitle ? { subtitle } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    };
  };
  if (Array.isArray(raw)) {
    const items = raw.slice(0, 8).map(toItem).filter((x): x is PublicStorefrontHighlight => x != null);
    return { heading: null, items: items.length ? items : null };
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const heading =
      typeof o.heading === "string" && o.heading.trim() ? o.heading.trim().slice(0, 120) : null;
    const arr = Array.isArray(o.items) ? o.items : [];
    const items = arr.slice(0, 8).map(toItem).filter((x): x is PublicStorefrontHighlight => x != null);
    if (!heading && items.length === 0) return { heading: null, items: null };
    return { heading, items: items.length ? items : null };
  }
  return { heading: null, items: null };
}

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

/** Title shown on the public shop when `StorefrontCollection.title` is blank (slug → Title Case). */
export function publicStorefrontCollectionDisplayTitle(
  rawTitle: string | null | undefined,
  slug: string | null | undefined,
): string {
  const t = (rawTitle ?? "").trim();
  if (t) return t;
  const s =
    (slug ?? "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-")
      .split("/")
      .pop() ?? "";
  if (!s) return "Collection";
  return s
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseRelatedIds(raw: unknown): bigint[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  const out: bigint[] = [];
  for (const x of raw) {
    try {
      out.push(BigInt(String(x)));
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function getPublicProductBySlug(
  organizationId: bigint,
  slug: string,
): Promise<PublicCatalogProduct | null> {
  const slugNorm = slug.trim().toLowerCase();
  const row = await prisma.posProduct.findFirst({
    where: {
      organizationId,
      slug: { equals: slugNorm, mode: "insensitive" },
      ...storefrontProductPublicLiveWhere(),
    },
    include: { category: true, brand: true },
  });
  if (!row) return null;

  const gallery = parseGallery(row.galleryImages);
  const galleryImages = (row.image ? [row.image, ...gallery.filter((u) => u !== row.image)] : gallery)
    .map((u) => String(u ?? "").trim())
    .filter(Boolean);
  const relIds = parseRelatedIds(row.relatedProductIds);
  let related: PublicCatalogProduct["related"] = [];
  if (relIds.length > 0) {
    const relRows = await prisma.posProduct.findMany({
      where: {
        id: { in: relIds },
        organizationId,
        ...storefrontProductPublicLiveWhere(),
      },
      select: { id: true, name: true, slug: true, price: true, image: true },
    });
    const order = new Map(relIds.map((id, i) => [id.toString(), i]));
    related = relRows
      .sort((a, b) => (order.get(a.id.toString()) ?? 0) - (order.get(b.id.toString()) ?? 0))
      .map((r) => ({
        id: r.id.toString(),
        name: r.name,
        slug: r.slug,
        price: Number(r.price),
        image: r.image,
      }));
  }

  const price = Number(row.price);
  const cmp = row.compareAtPrice != null ? Number(row.compareAtPrice) : null;
  const hl = parseStorefrontHighlightsPublic(row.storefrontHighlights);

  return {
    id: row.id.toString(),
    name: row.name,
    description: row.description,
    slug: row.slug,
    sku: row.sku,
    barcode: row.barcode,
    price,
    compareAtPrice: cmp,
    stock: row.stock,
    stockAlert: row.stockAlert ?? 5,
    inventoryPolicy: row.inventoryPolicy ?? "track",
    image: row.image?.trim() || null,
    galleryImages,
    seoTitle: row.storefrontSeoTitle,
    seoDescription: row.storefrontSeoDescription,
    categoryName: row.category?.name ?? null,
    brandName: row.brand?.name ?? null,
    variants: jsonCloneForClient(row.variants),
    storefrontHighlights: hl.items,
    storefrontHighlightsHeading: hl.heading,
    related,
  };
}

/**
 * One live catalog product marked “Featured product” in POS — used to hydrate the Concept homepage
 * `.featured-product` spotlight (not the full `/shop/products/...` PDP).
 */
export async function getPublicFeaturedSpotlightProduct(
  organizationId: bigint,
): Promise<PublicCatalogProduct | null> {
  const row = await prisma.posProduct.findFirst({
    where: {
      organizationId,
      storefrontFeatured: true,
      slug: { not: null },
      ...storefrontProductPublicLiveWhere(),
    },
    orderBy: [{ updatedAt: "desc" }],
    select: { slug: true },
  });
  const slug = row?.slug?.trim();
  if (!slug) return null;
  return getPublicProductBySlug(organizationId, slug);
}

export type PublicCatalogCollection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  products: Array<{
    id: string;
    name: string;
    slug: string | null;
    price: number;
    image: string | null;
    compareAtPrice: number | null;
    stock: number;
    inventoryPolicy: string;
    createdAt: string;
    categoryId: string | null;
    categoryName: string | null;
  }>;
};

export type PublicCatalogSearchProduct = {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  image: string | null;
  compareAtPrice: number | null;
  stock: number;
  createdAt: string;
  categoryId: string | null;
  categoryName: string | null;
};

/** Day 35 — Search / filter / sort storefront catalog (tenant-scoped, published products only). */
/** Minimal row for Concept static homepage flavor-slider injection. */
export type ConceptHomeGridProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image: string | null;
  description: string | null;
  /** Optional brand line for Concept-style product cards (mega menu, etc.). */
  brandName?: string | null;
};

/**
 * Newest/updated published products with slugs — used to hydrate the Concept `motion-list` flavor grid on `/shop`.
 */
export async function listPublicProductsForConceptHomeGrid(params: {
  organizationId: bigint;
  take?: number;
  /** When true, products with `storefrontFeatured` sort first, then by recency. */
  prioritizeFeatured?: boolean;
}): Promise<ConceptHomeGridProduct[]> {
  const take = Math.min(24, Math.max(1, params.take ?? 12));
  const orderBy = params.prioritizeFeatured
    ? [{ storefrontFeatured: "desc" as const }, { updatedAt: "desc" as const }]
    : { createdAt: "desc" as const };
  const rows = await prisma.posProduct.findMany({
    where: {
      organizationId: params.organizationId,
      ...storefrontProductPublicLiveWhere(),
      slug: { not: null },
    },
    orderBy,
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      stock: true,
      image: true,
      description: true,
    },
  });
  return rows.map((r) => ({
    id: r.id.toString(),
    name: r.name,
    slug: r.slug!,
    price: Number(r.price),
    stock: r.stock,
    image: r.image,
    description: r.description,
  }));
}

export async function searchPublicCatalogProducts(params: {
  organizationId: bigint;
  websiteId: bigint;
  q?: string;
  collectionSlug?: string | null;
  /** Limit to POS category id, or `"none"` for uncategorized (`categoryId` null). */
  categoryId?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStockOnly?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "best_selling";
  skip?: number;
  take?: number;
}): Promise<{ products: PublicCatalogSearchProduct[]; total: number }> {
  const take = Math.min(60, Math.max(1, params.take ?? 24));
  const skip = Math.max(0, params.skip ?? 0);
  const q = (params.q ?? "").trim().toLowerCase();

  let collectionProductIds: bigint[] | null = null;
  if (params.collectionSlug?.trim()) {
    const slugNorm = params.collectionSlug.trim().toLowerCase();
    const col = await prisma.storefrontCollection.findFirst({
      where: {
        organizationId: params.organizationId,
        slug: { equals: slugNorm, mode: "insensitive" },
        published: true,
        OR: [{ websiteId: null }, { websiteId: params.websiteId }],
      },
      select: {
        products: { select: { productId: true } },
      },
    });
    collectionProductIds = col ? col.products.map((p) => p.productId) : [];
  }

  if (collectionProductIds && collectionProductIds.length === 0) {
    return { total: 0, products: [] };
  }

  const catRaw = (params.categoryId ?? "").trim().toLowerCase();
  let categoryWhere: { categoryId: bigint } | { categoryId: null } | Record<string, never> = {};
  if (catRaw === "none") {
    categoryWhere = { categoryId: null };
  } else if (/^\d+$/.test(catRaw)) {
    categoryWhere = { categoryId: BigInt(catRaw) };
  }

  const baseWhere = {
    organizationId: params.organizationId,
    ...storefrontProductPublicLiveWhere(),
    slug: { not: null } as const,
    ...(collectionProductIds ? { id: { in: collectionProductIds } } : {}),
    ...categoryWhere,
  };

  const priceFilter =
    params.minPrice != null || params.maxPrice != null
      ? {
          price: {
            ...(params.minPrice != null ? { gte: params.minPrice } : {}),
            ...(params.maxPrice != null ? { lte: params.maxPrice } : {}),
          },
        }
      : {};

  const stockFilter = params.inStockOnly ? { stock: { gt: 0 } } : {};

  const searchWhere =
    q.length > 0
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

  const where = {
    ...baseWhere,
    ...priceFilter,
    ...stockFilter,
    ...searchWhere,
  };

  const orderBy: Prisma.PosProductOrderByWithRelationInput[] =
    params.sort === "price_asc"
      ? [{ price: "asc" }]
      : params.sort === "price_desc"
        ? [{ price: "desc" }]
        : params.sort === "best_selling"
          ? [{ storefrontFeatured: "desc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

  const [total, rows] = await prisma.$transaction([
    prisma.posProduct.count({ where }),
    prisma.posProduct.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        image: true,
        compareAtPrice: true,
        stock: true,
        createdAt: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    total,
    products: rows.map((r) => ({
      id: r.id.toString(),
      name: r.name,
      slug: r.slug,
      price: Number(r.price),
      image: r.image,
      compareAtPrice: r.compareAtPrice != null ? Number(r.compareAtPrice) : null,
      stock: r.stock,
      createdAt: r.createdAt.toISOString(),
      categoryId: r.categoryId != null ? r.categoryId.toString() : null,
      categoryName: r.category?.name?.trim() || null,
    })),
  };
}

export async function getPublicCollectionBySlug(
  organizationId: bigint,
  websiteId: bigint,
  slug: string,
): Promise<PublicCatalogCollection | null> {
  const slugNorm = slug.trim().toLowerCase();
  const col = await prisma.storefrontCollection.findFirst({
    where: {
      organizationId,
      slug: { equals: slugNorm, mode: "insensitive" },
      published: true,
      OR: [{ websiteId: null }, { websiteId }],
    },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              image: true,
              compareAtPrice: true,
              stock: true,
              inventoryPolicy: true,
              createdAt: true,
              storefrontPublished: true,
              isActive: true,
              storefrontPublishAt: true,
              categoryId: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!col) return null;

  const now = new Date();
  const products = col.products
    .filter((l) => {
      const p = l.product;
      if (!p.storefrontPublished || !p.isActive || !p.slug) return false;
      if (p.storefrontPublishAt != null && p.storefrontPublishAt > now) return false;
      return true;
    })
    .map((l) => ({
      id: l.product.id.toString(),
      name: l.product.name,
      slug: l.product.slug,
      price: Number(l.product.price),
      image: l.product.image,
      compareAtPrice: l.product.compareAtPrice != null ? Number(l.product.compareAtPrice) : null,
      stock: l.product.stock,
      inventoryPolicy: l.product.inventoryPolicy ?? "track",
      createdAt: l.product.createdAt.toISOString(),
      categoryId: l.product.categoryId != null ? l.product.categoryId.toString() : null,
      categoryName: l.product.category?.name?.trim() || null,
    }));

  return {
    id: col.id.toString(),
    title: publicStorefrontCollectionDisplayTitle(col.title, col.slug),
    slug: col.slug,
    description: col.description,
    seoTitle: col.seoTitle,
    seoDescription: col.seoDescription,
    products,
  };
}

export type PublicStorefrontCollectionListRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  productCount: number;
  /** First storefront-visible linked product image (for Liquid `collection.featured_image`). */
  featuredImageUrl: string | null;
};

/** Published collections for Liquid `list-collections` / `collections` iteration (tenant + website scope). */
export async function listPublicStorefrontCollections(
  organizationId: bigint,
  websiteId: bigint,
): Promise<PublicStorefrontCollectionListRow[]> {
  try {
    const cols = await prisma.storefrontCollection.findMany({
      where: {
        organizationId,
        published: true,
        OR: [{ websiteId: null }, { websiteId }],
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        _count: {
          select: {
            products: {
              where: { product: storefrontProductPublicLiveWhere() },
            },
          },
        },
        products: {
          where: { product: storefrontProductPublicLiveWhere() },
          orderBy: { sortOrder: "asc" },
          take: 24,
          select: {
            product: { select: { image: true, galleryImages: true } },
          },
        },
      },
    });
    return cols.map((c) => {
      let featuredImageUrl: string | null = null;
      for (const link of c.products) {
        const url = storefrontProductPrimaryImageUrl(link.product.image, link.product.galleryImages);
        if (url?.trim()) {
          featuredImageUrl = url.trim();
          break;
        }
      }
      const slugRaw = (c.slug ?? "").trim();
      return {
        id: c.id.toString(),
        title: publicStorefrontCollectionDisplayTitle(c.title, slugRaw),
        slug: slugRaw.toLowerCase(),
        description: c.description,
        productCount: c._count.products,
        featuredImageUrl,
      };
    });
  } catch (e) {
    if (isStorefrontCollectionsSchemaMissing(e)) {
      console.warn(
        "[storefront] listPublicStorefrontCollections: DB missing storefront collection tables/columns — run `npx prisma migrate deploy` in `nextjs/`.",
      );
      return [];
    }
    throw e;
  }
}

/** Published collections + live products for the Concept theme “Best Sellers” tabbed section. */
export type ConceptFeaturedTabsCollection = {
  title: string;
  slug: string;
  /** Total live storefront products in the collection (for “All … (n)” links). */
  productCount: number;
  /** First product image in collection sort order (for mega-menu / cards). */
  featuredImageUrl: string | null;
  products: ConceptHomeGridProduct[];
};

/**
 * Loads up to N **published** storefront collections for the Concept “Best Sellers” tabs.
 * Includes every matching collection (up to `maxTabs`), not only those with links: empty tabs show a placeholder.
 * Order: most **live** storefront products first, then `sortOrder`, then title. Draft/unpublished never appear.
 */
export async function listFeaturedTabsCollectionsForConceptHome(
  organizationId: bigint,
  websiteId: bigint,
  options?: { maxTabs?: number; maxProductsPerTab?: number },
): Promise<ConceptFeaturedTabsCollection[]> {
  const maxTabs = Math.min(100, Math.max(1, options?.maxTabs ?? 50));
  const maxProducts = Math.min(24, Math.max(1, options?.maxProductsPerTab ?? 12));

  const collectionScope: Prisma.StorefrontCollectionWhereInput = {
    organizationId,
    published: true,
    OR: [{ websiteId: null }, { websiteId }],
  };

  try {
    const summaries = await prisma.storefrontCollection.findMany({
      where: collectionScope,
      select: {
        id: true,
        title: true,
        slug: true,
        sortOrder: true,
        _count: {
          select: {
            products: {
              where: {
                product: storefrontProductPublicLiveWhere(),
              },
            },
          },
        },
      },
    });

    if (summaries.length === 0) return [];

    summaries.sort((a, b) => {
      const ca = a._count.products;
      const cb = b._count.products;
      if (cb !== ca) return cb - ca;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return (a.title ?? "").localeCompare(b.title ?? "", undefined, { sensitivity: "base" });
    });

    const selected = summaries.slice(0, maxTabs);
    const topIds = selected.map((s) => s.id);
    const productCountById = new Map<string, number>(
      selected.map((s) => [s.id.toString(), s._count.products]),
    );

    const cols = await prisma.storefrontCollection.findMany({
      where: { id: { in: topIds }, ...collectionScope },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: { product: { include: { brand: { select: { name: true } } } } },
        },
      },
    });

    const order = new Map(topIds.map((id, i) => [id.toString(), i]));
    cols.sort((a, b) => (order.get(a.id.toString()) ?? 999) - (order.get(b.id.toString()) ?? 999));

    const now = new Date();
    const out: ConceptFeaturedTabsCollection[] = [];

    for (const col of cols) {
      let featuredImageUrl: string | null = null;
      for (const l of col.products) {
        const url = storefrontProductPrimaryImageUrl(l.product.image, l.product.galleryImages);
        if (url?.trim()) {
          featuredImageUrl = url.trim();
          break;
        }
      }

      const products: ConceptHomeGridProduct[] = [];
      for (const l of col.products) {
        const p = l.product;
        if (!p.storefrontPublished || !p.isActive || !p.slug) continue;
        if (p.storefrontPublishAt != null && p.storefrontPublishAt > now) continue;
        products.push({
          id: p.id.toString(),
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          stock: p.stock,
          image: p.image,
          description: p.description,
          brandName: p.brand?.name?.trim() || null,
        });
        if (products.length >= maxProducts) break;
      }
      const slugRaw = (col.slug ?? "").trim();
      out.push({
        title: publicStorefrontCollectionDisplayTitle(col.title, slugRaw),
        slug: slugRaw.toLowerCase(),
        productCount: productCountById.get(col.id.toString()) ?? products.length,
        featuredImageUrl,
        products,
      });
    }

    return out;
  } catch (e) {
    if (isStorefrontCollectionsSchemaMissing(e)) {
      console.warn(
        "[storefront] listFeaturedTabsCollectionsForConceptHome: DB missing storefront collection tables/columns — run `npx prisma migrate deploy` in `nextjs/`.",
      );
      return [];
    }
    throw e;
  }
}

/** Public storefront blog card / list row (published only). */
export type PublicBlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  featuredImageUrl: string | null;
  category: string | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

/**
 * Published posts visible on the public shop for this organization.
 * We intentionally do **not** filter by `websiteId`: admin “Website” is optional metadata; merchants expect
 * posts to appear on whichever domain routes to this org (localhost vs primary domain often map to different
 * `Website` rows). Per-site isolation can be added later behind an explicit flag.
 */
export const publicBlogPublishedWhere = (organizationId: bigint): Prisma.StorefrontBlogPostWhereInput => {
  const now = new Date();
  return {
    organizationId,
    status: { equals: "published", mode: "insensitive" },
    AND: [{ OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] }],
  };
};

/**
 * Home “Latest Stories” collage: up to 3 posts, featured-home first, then most recent.
 */
export async function listPublicBlogPostsForConceptLatestStories(
  organizationId: bigint,
  _websiteId: bigint,
  take: number = 3,
): Promise<PublicBlogPostSummary[]> {
  const delegate = getStorefrontBlogPostDelegate();
  if (!delegate) return [];
  const n = Math.min(12, Math.max(1, take));
  const rows = await delegate.findMany({
    where: publicBlogPublishedWhere(organizationId),
    orderBy: [{ isFeaturedHome: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
    take: n,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      bodyHtml: true,
      featuredImageUrl: true,
      category: true,
      publishedAt: true,
      updatedAt: true,
      seoTitle: true,
      seoDescription: true,
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    bodyHtml: r.bodyHtml,
    featuredImageUrl: r.featuredImageUrl,
    category: r.category,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
  }));
}

/** Full blog index for `/shop/blog`. */
export async function listPublicBlogPostsForShop(
  organizationId: bigint,
  _websiteId: bigint,
  options?: { take?: number },
): Promise<PublicBlogPostSummary[]> {
  const delegate = getStorefrontBlogPostDelegate();
  if (!delegate) return [];
  const take = Math.min(100, Math.max(1, options?.take ?? 50));
  const rows = await delegate.findMany({
    where: publicBlogPublishedWhere(organizationId),
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      bodyHtml: true,
      featuredImageUrl: true,
      category: true,
      publishedAt: true,
      updatedAt: true,
      seoTitle: true,
      seoDescription: true,
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    bodyHtml: r.bodyHtml,
    featuredImageUrl: r.featuredImageUrl,
    category: r.category,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
  }));
}

export async function getPublicBlogPostBySlug(
  organizationId: bigint,
  _websiteId: bigint,
  slug: string,
): Promise<PublicBlogPostSummary | null> {
  const delegate = getStorefrontBlogPostDelegate();
  if (!delegate) return null;
  const normalized = slug.trim().toLowerCase();
  const row = await delegate.findFirst({
    where: {
      organizationId,
      status: { equals: "published", mode: "insensitive" },
      slug: { equals: normalized, mode: "insensitive" },
      AND: [{ OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] }],
    },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      bodyHtml: true,
      featuredImageUrl: true,
      category: true,
      publishedAt: true,
      updatedAt: true,
      seoTitle: true,
      seoDescription: true,
    },
  });
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyHtml: row.bodyHtml,
    featuredImageUrl: row.featuredImageUrl,
    category: row.category,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}
