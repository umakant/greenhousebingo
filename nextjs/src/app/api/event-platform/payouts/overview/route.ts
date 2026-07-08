import { NextRequest, NextResponse } from "next/server";

import { getPayoutOverview } from "@/lib/event-platform/payouts/payout-overview-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "payouts.manage");
  if (isEventPlatformApiError(actor)) return actor;

  if (req.nextUrl.searchParams.get("demo") === "1") {
    const { payoutOverviewDemo } = await import("@/lib/event-platform/payouts/payout-overview-demo");
    return NextResponse.json(payoutOverviewDemo());
  }

  const overview = await getPayoutOverview(actor.organizationId);
  return NextResponse.json(overview);
}
