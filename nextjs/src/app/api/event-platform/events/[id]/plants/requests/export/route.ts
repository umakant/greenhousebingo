import { NextRequest, NextResponse } from "next/server";

import {
  getEventPlantsOverview,
  plantRequestsToCsv,
} from "@/lib/event-platform/event-plants/event-plant-service";
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
  const overview = await getEventPlantsOverview(actor.organizationId, id);
  if (!overview) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }

  const csv = plantRequestsToCsv(overview.requests);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${id}-plant-requests.csv"`,
    },
  });
}
