import { NextRequest, NextResponse } from "next/server";

import { listPublicStorefrontCollections } from "@/lib/storefront/public-catalog";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/** Published storefront collections for empty mini-cart / marketing surfaces (host-scoped). */
export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const ctx = await getPublicStorefrontContextFromHost(host);
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Store not found for this host" }, { status: 404 });
    }

    const rows = await listPublicStorefrontCollections(ctx.organizationId, ctx.websiteId);
    return NextResponse.json({
      ok: true,
      collections: rows.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        productCount: c.productCount,
        featuredImageUrl: c.featuredImageUrl,
        description: c.description,
      })),
    });
  } catch (e) {
    console.error("[storefront/public/collections] GET failed:", e);
    const message = e instanceof Error ? e.message : "Failed to load collections.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
