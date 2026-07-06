import { NextRequest, NextResponse } from "next/server";

import { listPublicBundleCatalogProducts } from "@/lib/storefront/bundle-catalog";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/** Public bundle grid payload for the active storefront host (published live products only). */
export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const products = await listPublicBundleCatalogProducts({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
  });

  return NextResponse.json({ ok: true, products });
}
