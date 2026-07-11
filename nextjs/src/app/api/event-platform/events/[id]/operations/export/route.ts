import { NextRequest, NextResponse } from "next/server";

import type { ActivityFilterCategory } from "@/lib/event-platform/event-operations/activity-constants";
import {
  activityExportCsv,
  getEventOperationsOverview,
} from "@/lib/event-platform/event-operations/event-operations-service";
import type { EventOperationsFilters } from "@/lib/event-platform/event-operations/event-operations-types";
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
  const sp = req.nextUrl.searchParams;
  const filters: EventOperationsFilters = {
    dateFrom: sp.get("dateFrom") ?? undefined,
    dateTo: sp.get("dateTo") ?? undefined,
    userId: sp.get("userId") ?? undefined,
    activityType: sp.get("activityType") ?? undefined,
    category: (sp.get("category") as ActivityFilterCategory | "all") ?? "all",
    attendeeId: sp.get("attendeeId") ?? undefined,
  };

  const overview = await getEventOperationsOverview(actor.organizationId, id, { filters });
  if (!overview) return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });

  const csv = activityExportCsv(overview.activity);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-activity-${id}.csv"`,
    },
  });
}
