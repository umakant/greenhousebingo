import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { getSeatmapOverview } from "@/lib/event-platform/seatmaps/seatmap-overview-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;

  if (req.nextUrl.searchParams.get("demo") === "1") {
    const { seatmapOverviewDemo } = await import("@/lib/event-platform/seatmaps/seatmap-overview-demo");
    return NextResponse.json(seatmapOverviewDemo());
  }

  const overview = await getSeatmapOverview(actor.organizationId);
  return NextResponse.json(overview);
}
