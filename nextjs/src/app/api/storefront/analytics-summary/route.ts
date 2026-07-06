import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { getStorefrontCommerceAnalytics } from "@/lib/storefront/analytics-commerce-service";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

/** Day 54 — KPI summary for Analytics UI. */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.ANALYTICS_VIEW, STOREFRONT_PERMISSION.VIEW],
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const sp = req.nextUrl.searchParams;
  const fromRaw = sp.get("from");
  const toRaw = sp.get("to");
  let from: Date | null = null;
  let to: Date | null = null;
  if (fromRaw) {
    const d = new Date(fromRaw);
    if (!Number.isNaN(d.getTime())) from = d;
  }
  if (toRaw) {
    const d = new Date(toRaw);
    if (!Number.isNaN(d.getTime())) to = d;
  }

  try {
    const data = await getStorefrontCommerceAnalytics({
      organizationId: org.organizationId,
      from,
      to,
    });
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load analytics";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
