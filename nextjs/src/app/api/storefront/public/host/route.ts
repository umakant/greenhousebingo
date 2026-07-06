import { NextRequest, NextResponse } from "next/server";

import { findDomainByHostname } from "@/lib/storefront/services/domain-service";
import { isLiveStorefrontDomain } from "@/lib/storefront/storefront-domain-live";
import { storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

export const dynamic = "force-dynamic";

/** Lightweight host check for middleware (custom domain → /shop rewrite). */
export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("hostname") ?? "").trim();
  const hostname = storefrontHostnameForLookup(raw);
  if (!hostname) {
    return NextResponse.json({ storefront: false });
  }
  const domain = await findDomainByHostname(hostname);
  const storefront = isLiveStorefrontDomain(domain);
  return NextResponse.json(
    { storefront, websiteId: domain?.website?.id?.toString() ?? null },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  );
}
