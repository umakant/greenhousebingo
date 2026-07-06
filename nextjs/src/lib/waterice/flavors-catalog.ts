import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PACK_SIZES,
  FLAVORS,
  flavorSlug,
  type Flavor,
  type FlavorCategory,
  type PackSize,
} from "@/data/waterice/flavors";
import { resolveWaterIceStoreOrgId } from "@/lib/waterice/waterice-store-org";

const PAGE_TEMPLATE_KEY = "waterice-flavor";
const VALID_CATEGORIES: FlavorCategory[] = ["Classic", "Fruit", "Cream-Based", "Candy", "Tropical"];

function toNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Rich-text descriptions are stored as HTML; the flavor pages render plain text. */
function htmlToPlainText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function normalizeCategory(value: unknown): FlavorCategory {
  return VALID_CATEGORIES.includes(value as FlavorCategory) ? (value as FlavorCategory) : "Fruit";
}

/** Validates the stored pack-size list; falls back to defaults when missing/invalid. */
function normalizePackSizes(value: unknown): PackSize[] {
  if (!Array.isArray(value)) return DEFAULT_PACK_SIZES;
  const cleaned: PackSize[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as { label?: unknown; qty?: unknown; perTub?: unknown };
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    const qty = toNumber(raw.qty, 0);
    const perTub = toNumber(raw.perTub, 0);
    if (!label || qty <= 0 || perTub <= 0) continue;
    cleaned.push({ label, qty, perTub });
  }
  return cleaned.length > 0 ? cleaned : DEFAULT_PACK_SIZES;
}

type FlavorMeta = {
  category?: unknown;
  rating?: unknown;
  reviews?: unknown;
  ingredients?: unknown;
  tastingNotes?: unknown;
  pairsWith?: unknown;
  highlights?: unknown;
  packSizes?: unknown;
};

function rowToFlavor(row: {
  name: string;
  slug: string | null;
  description: string | null;
  price: unknown;
  compareAtPrice: unknown;
  image: string | null;
  flavorMeta: unknown;
}): Flavor {
  const meta = (row.flavorMeta ?? {}) as FlavorMeta;
  const price = toNumber(row.price);
  return {
    name: row.name,
    slug: row.slug || flavorSlug(row.name),
    category: normalizeCategory(meta.category),
    price,
    oldPrice: row.compareAtPrice != null ? toNumber(row.compareAtPrice, price) : price,
    rating: toNumber(meta.rating, 5),
    reviews: toNumber(meta.reviews, 0),
    image: row.image ?? "",
    description: htmlToPlainText(row.description),
    ingredients: asStringArray(meta.ingredients),
    tastingNotes: typeof meta.tastingNotes === "string" ? meta.tastingNotes : "",
    pairsWith: asStringArray(meta.pairsWith),
    highlights: asStringArray(meta.highlights),
    packSizes: normalizePackSizes(meta.packSizes),
  };
}

/**
 * Returns the Water Ice Express landing flavors from the storefront catalog,
 * falling back to the bundled static list when the catalog is empty or the DB
 * is unavailable (dev / pre-seed safety).
 */
export async function getWaterIceFlavors(): Promise<Flavor[]> {
  try {
    const organizationId = await resolveWaterIceStoreOrgId();
    if (organizationId == null) return FLAVORS;
    const rows = await prisma.posProduct.findMany({
      where: {
        organizationId,
        pageTemplateKey: PAGE_TEMPLATE_KEY,
        storefrontPublished: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        description: true,
        price: true,
        compareAtPrice: true,
        image: true,
        flavorMeta: true,
      },
    });
    if (rows.length === 0) return FLAVORS;
    return rows.map(rowToFlavor);
  } catch {
    return FLAVORS;
  }
}

export async function getWaterIceFlavorBySlug(slug: string): Promise<Flavor | undefined> {
  const flavors = await getWaterIceFlavors();
  return flavors.find((f) => f.slug === slug) ?? flavors.find((f) => flavorSlug(f.name) === slug);
}

/** Up to `limit` related flavors: same category first, then fillers. */
export function relatedFlavors(all: Flavor[], current: Flavor, limit = 3): Flavor[] {
  const others = all.filter((x) => x.name !== current.name);
  const sameCategory = others.filter((x) => x.category === current.category);
  const combined = sameCategory.length >= limit ? sameCategory : [...sameCategory, ...others];
  const seen = new Set<string>();
  const result: Flavor[] = [];
  for (const f of combined) {
    if (seen.has(f.name)) continue;
    seen.add(f.name);
    result.push(f);
    if (result.length >= limit) break;
  }
  return result;
}
