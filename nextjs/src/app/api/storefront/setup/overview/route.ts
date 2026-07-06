import { NextResponse, type NextRequest } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { loadStorefrontSetupOverviewFromSession } from "@/lib/storefront/setup-overview-server";

/**
 * JSON snapshot of merchant storefront setup checklist (same payload as Storefronts → Overview RSC).
 * Query: `websiteId` optional — scopes checklist to that website when permitted.
 */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.VIEW,
  });
  if (denied) return denied;

  const websiteIdParam = req.nextUrl.searchParams.get("websiteId") ?? undefined;
  const result = await loadStorefrontSetupOverviewFromSession(websiteIdParam, req.cookies);

  if (result.kind === "unauthenticated") {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (result.kind === "no_organization") {
    return NextResponse.json(
      { ok: false, message: "No company context for storefront setup.", code: "no_organization" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, overview: result.overview });
}
