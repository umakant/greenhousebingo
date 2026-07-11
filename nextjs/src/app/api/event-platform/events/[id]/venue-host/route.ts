import { NextRequest, NextResponse } from "next/server";

import {
  getVenueHostOverview,
} from "@/lib/event-platform/event-venue-host/event-venue-host-service";
import type { VenueHostChartFilter } from "@/lib/event-platform/event-venue-host/event-venue-host-types";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { userHasEventPlatformPermission } from "@/lib/event-platform/permissions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const CHART_FILTERS = new Set<VenueHostChartFilter>(["last_5", "last_10", "last_12_months", "all"]);

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const rawFilter = sp.get("chartFilter") ?? "last_10";
  const chartFilter = CHART_FILTERS.has(rawFilter as VenueHostChartFilter)
    ? (rawFilter as VenueHostChartFilter)
    : "last_10";

  const canManage =
    userHasEventPlatformPermission(actor.permissions, "events.update") ||
    userHasEventPlatformPermission(actor.permissions, "hosts.manage");

  try {
    const overview = await getVenueHostOverview(actor.organizationId, id, {
      canManage,
      chartFilter,
    });
    if (!overview) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, overview });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load venue & host data.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
