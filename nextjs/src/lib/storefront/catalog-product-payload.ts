import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * DB `Json` fields (variants, highlights) must be plain JSON for `NextResponse.json` — Prisma can surface
 * `BigInt` in nested objects, and `Decimal`-like values break `JSON.stringify` in production.
 */
export function jsonValueForHttpResponse(value: unknown): unknown | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) => {
        if (typeof v === "bigint") return v.toString();
        if (
          typeof v === "object" &&
          v !== null &&
          "toNumber" in v &&
          typeof (v as { toNumber: () => number }).toNumber === "function"
        ) {
          return (v as { toNumber: () => number }).toNumber();
        }
        return v;
      }),
    ) as unknown;
  } catch {
    return null;
  }
}

export function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "product";
}

export function parseCollectionIds(body: Record<string, unknown>): bigint[] {
  const raw = body.collectionIds;
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

export function parseInventoryPolicy(raw: unknown): string {
  if (raw == null || raw === "") return "track";
  const s = String(raw).toLowerCase();
  if (s === "track" || s === "continue" || s === "deny") return s;
  return "track";
}

export function parseGalleryUrls(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return undefined;
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

/** Admin / API body → DB JSON for `pos_products.storefront_highlights` (max 8 rows). */
export function parseStorefrontHighlightsForDb(
  raw: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (raw === null) return Prisma.JsonNull;

  let rows: unknown[] = [];
  let heading: string | undefined;
  if (Array.isArray(raw)) {
    rows = raw;
  } else if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      rows = o.items;
      if (typeof o.heading === "string" && o.heading.trim()) {
        heading = o.heading.trim().slice(0, 120);
      }
    } else {
      return Prisma.JsonNull;
    }
  } else {
    return Prisma.JsonNull;
  }

  const out: Array<{ title: string; subtitle?: string; imageUrl?: string }> = [];
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const cell = rows[i];
    if (!cell || typeof cell !== "object") continue;
    const r = cell as Record<string, unknown>;
    const title = String(r.title ?? "").trim().slice(0, 120);
    if (!title) continue;
    const subtitle = String(r.subtitle ?? "").trim().slice(0, 200);
    const imageUrl = String(r.imageUrl ?? "").trim().slice(0, 2048);
    out.push({
      title,
      ...(subtitle ? { subtitle } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    });
  }

  if (out.length === 0 && !heading) return Prisma.JsonNull;
  if (heading && out.length > 0) {
    return { heading, items: out } as unknown as Prisma.InputJsonValue;
  }
  if (heading && out.length === 0) {
    return { heading, items: [] } as unknown as Prisma.InputJsonValue;
  }
  return out as unknown as Prisma.InputJsonValue;
}

export type VariantParse =
  | { ok: true; hasVariants: false }
  | { ok: true; hasVariants: true; variants: Prisma.InputJsonValue; price: number; stock: number }
  | { ok: false; message: string };

export function parseVariantsForCreate(body: Record<string, unknown>): VariantParse {
  const raw = body.variants;
  if (raw === undefined || raw === null) return { ok: true, hasVariants: false };
  if (!Array.isArray(raw) || raw.length === 0) return { ok: true, hasVariants: false };

  const rows: Array<{ id: string; name: string; sku?: string; price: number; stock: number }> = [];
  for (let i = 0; i < raw.length; i++) {
    const o = raw[i];
    if (!o || typeof o !== "object") continue;
    const rec = o as Record<string, unknown>;
    const vn = String(rec.name ?? "").trim();
    if (!vn) return { ok: false, message: `Each variant needs a name (row ${i + 1}).` };
    const price = Number(rec.price);
    const stock = Math.floor(Number(rec.stock));
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, message: `Invalid price on variant “${vn}”.` };
    }
    if (!Number.isFinite(stock) || stock < 0) {
      return { ok: false, message: `Invalid stock on variant “${vn}”.` };
    }
    const sku = rec.sku != null ? String(rec.sku).trim() : "";
    const id = String(rec.id ?? "").trim() || `v-${i}-${Math.random().toString(36).slice(2, 10)}`;
    rows.push({
      id,
      name: vn,
      ...(sku ? { sku } : {}),
      price,
      stock,
    });
  }
  if (rows.length === 0) return { ok: true, hasVariants: false };
  const sumStock = rows.reduce((a, r) => a + r.stock, 0);
  const minPrice = Math.min(...rows.map((r) => r.price));
  return { ok: true, hasVariants: true, variants: rows as unknown as Prisma.InputJsonValue, price: minPrice, stock: sumStock };
}

export async function optionalCategoryId(raw: unknown): Promise<bigint | null> {
  if (raw == null || raw === "") return null;
  try {
    const id = BigInt(String(raw));
    const row = await prisma.posCategory.findUnique({ where: { id }, select: { id: true } });
    return row ? id : null;
  } catch {
    return null;
  }
}

export async function optionalBrandId(raw: unknown): Promise<bigint | null> {
  if (raw == null || raw === "") return null;
  try {
    const id = BigInt(String(raw));
    const row = await prisma.posBrand.findUnique({ where: { id }, select: { id: true } });
    return row ? id : null;
  } catch {
    return null;
  }
}
