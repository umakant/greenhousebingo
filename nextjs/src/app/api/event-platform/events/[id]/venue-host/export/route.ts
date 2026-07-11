import { NextRequest, NextResponse } from "next/server";

import {
  getVenueHostOverview,
  venueHostHistoryCsv,
} from "@/lib/event-platform/event-venue-host/event-venue-host-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  const section = req.nextUrl.searchParams.get("section") === "host" ? "host" : "venue";

  const overview = await getVenueHostOverview(actor.organizationId, id, { chartFilter: "all" });
  if (!overview) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }

  const csv = venueHostHistoryCsv(overview, section);
  const filename = section === "host" ? "host-history.csv" : "venue-history.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
