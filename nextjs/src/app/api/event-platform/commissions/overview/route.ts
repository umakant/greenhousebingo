import { NextRequest, NextResponse } from "next/server";

import { getCommissionOverview } from "@/lib/event-platform/commissions/commission-overview-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "commissions.manage");
  if (isEventPlatformApiError(actor)) return actor;

  const forceDemo = req.nextUrl.searchParams.get("demo") === "1";
  if (forceDemo) {
    const { commissionOverviewDemo } = await import("@/lib/event-platform/commissions/commission-overview-demo");
    const { readGlobalCommissionRate } = await import("@/lib/event-platform/dashboard-service");
    const rate = await readGlobalCommissionRate(actor.organizationId);
    return NextResponse.json(commissionOverviewDemo(rate));
  }

  const overview = await getCommissionOverview(actor.organizationId);
  return NextResponse.json(overview);
}
