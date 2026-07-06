import "server-only";

import { prisma } from "@/lib/prisma";
import { BOOKS, type Book, type Category } from "@/data/waterice/ebooks";
import { resolveWaterIceStoreOrgId } from "@/lib/waterice/waterice-store-org";

const PAGE_TEMPLATE_KEY = "waterice-ebook";
const VALID_CATEGORIES: Category[] = ["Starter Guides", "Operations", "Marketing", "Business Growth"];

function toNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Rich-text descriptions are stored as HTML; the eBook pages render plain text. */
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
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

function normalizeCategory(value: unknown): Category {
  return VALID_CATEGORIES.includes(value as Category) ? (value as Category) : "Starter Guides";
}

type EbookMeta = {
  category?: unknown;
  pages?: unknown;
  rating?: unknown;
  reviews?: unknown;
  tagline?: unknown;
  highlights?: unknown;
  chapters?: unknown;
  author?: { name?: unknown; role?: unknown } | null;
};

function rowToBook(row: {
  name: string;
  slug: string | null;
  description: string | null;
  price: unknown;
  compareAtPrice: unknown;
  image: string | null;
  ebookMeta: unknown;
}): Book {
  const meta = (row.ebookMeta ?? {}) as EbookMeta;
  const price = toNumber(row.price);
  const author = meta.author ?? {};
  return {
    slug: row.slug ?? "",
    title: row.name,
    category: normalizeCategory(meta.category),
    price,
    oldPrice: row.compareAtPrice != null ? toNumber(row.compareAtPrice, price) : price,
    pages: toNumber(meta.pages, 0),
    rating: toNumber(meta.rating, 5),
    reviews: toNumber(meta.reviews, 0),
    cover: row.image ?? "",
    tagline: typeof meta.tagline === "string" ? meta.tagline : "",
    description: htmlToPlainText(row.description),
    highlights: asStringArray(meta.highlights),
    chapters: asStringArray(meta.chapters),
    author: {
      name: typeof author?.name === "string" ? author.name : "Water Ice Express LLC",
      role: typeof author?.role === "string" ? author.role : "Publisher",
    },
  };
}

/**
 * Returns the Water Ice Express landing eBooks from the storefront catalog,
 * falling back to the bundled static list when the catalog is empty or the DB
 * is unavailable (dev / pre-seed safety).
 */
export async function getWaterIceEbooks(): Promise<Book[]> {
  try {
    const organizationId = await resolveWaterIceStoreOrgId();
    if (organizationId == null) return BOOKS;
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
        ebookMeta: true,
      },
    });
    if (rows.length === 0) return BOOKS;
    return rows.map(rowToBook);
  } catch {
    return BOOKS;
  }
}

export async function getWaterIceEbookBySlug(slug: string): Promise<Book | undefined> {
  const books = await getWaterIceEbooks();
  return books.find((b) => b.slug === slug);
}

/** Up to `limit` related eBooks: same category first, then fillers. */
export function relatedBooks(all: Book[], current: Book, limit = 3): Book[] {
  const others = all.filter((x) => x.slug !== current.slug);
  const sameCategory = others.filter((x) => x.category === current.category);
  const combined = sameCategory.length >= limit ? sameCategory : [...sameCategory, ...others];
  const seen = new Set<string>();
  const result: Book[] = [];
  for (const b of combined) {
    if (seen.has(b.slug)) continue;
    seen.add(b.slug);
    result.push(b);
    if (result.length >= limit) break;
  }
  return result;
}
