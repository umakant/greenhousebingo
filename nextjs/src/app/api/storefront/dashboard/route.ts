import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { getStorefrontDashboardStats } from "@/lib/storefront/services/dashboard-stats-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  try {
    const data = await getStorefrontDashboardStats(org.organizationId);
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load dashboard.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
