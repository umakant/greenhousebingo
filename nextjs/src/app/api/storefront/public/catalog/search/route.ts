import { NextRequest, NextResponse } from "next/server";

import { searchPublicCatalogProducts } from "@/lib/storefront/public-catalog";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/** Day 35 — Public catalog search / filter / sort (domain-scoped). */
export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? undefined;
  const collectionSlug = sp.get("collection") ?? sp.get("collectionSlug") ?? undefined;
  const sortRaw = (sp.get("sort") ?? "newest").toLowerCase();
  const sort =
    sortRaw === "price_asc" || sortRaw === "price_ascending"
      ? ("price_asc" as const)
      : sortRaw === "price_desc" || sortRaw === "price_descending"
        ? ("price_desc" as const)
        : sortRaw === "best_selling" || sortRaw === "bestselling" || sortRaw === "featured"
          ? ("best_selling" as const)
          : ("newest" as const);
  const categoryIdRaw = sp.get("categoryId")?.trim();
  const categoryId =
    categoryIdRaw && (categoryIdRaw.toLowerCase() === "none" || /^\d+$/.test(categoryIdRaw))
      ? categoryIdRaw.toLowerCase() === "none"
        ? "none"
        : categoryIdRaw
      : null;
  const minPrice = sp.get("minPrice") != null ? Number(sp.get("minPrice")) : null;
  const maxPrice = sp.get("maxPrice") != null ? Number(sp.get("maxPrice")) : null;
  const inStockOnly = sp.get("inStock") === "1" || sp.get("inStock") === "true";
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const take = Math.min(60, Math.max(1, Number(sp.get("limit") ?? "24") || 24));
  const skip = (page - 1) * take;

  const min = minPrice != null && !Number.isNaN(minPrice) ? minPrice : null;
  const max = maxPrice != null && !Number.isNaN(maxPrice) ? maxPrice : null;

  const result = await searchPublicCatalogProducts({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    q,
    collectionSlug: collectionSlug ?? null,
    categoryId,
    minPrice: min,
    maxPrice: max,
    inStockOnly,
    sort,
    skip,
    take,
  });

  return NextResponse.json({
    ok: true,
    ...result,
    page,
    pageSize: take,
  });
}
