import { NextRequest, NextResponse } from "next/server";

import { listFeaturedTabsCollectionsForConceptHome } from "@/lib/storefront/public-catalog";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/** Published collections + preview products for the header Shop mega-menu (host-scoped). */
export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const ctx = await getPublicStorefrontContextFromHost(host);
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Store not found for this host" }, { status: 404 });
    }

    const rows = await listFeaturedTabsCollectionsForConceptHome(ctx.organizationId, ctx.websiteId, {
      maxTabs: 8,
      maxProductsPerTab: 12,
    });

    return NextResponse.json({
      ok: true,
      collections: rows.map((c) => ({
        title: c.title,
        slug: c.slug,
        productCount: c.productCount,
        featuredImageUrl: c.featuredImageUrl,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          stock: p.stock,
          image: p.image,
          description: p.description,
          brandName: p.brandName ?? null,
        })),
      })),
    });
  } catch (e) {
    console.error("[storefront/public/mega-menu] GET failed:", e);
    const message = e instanceof Error ? e.message : "Failed to load mega-menu.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
