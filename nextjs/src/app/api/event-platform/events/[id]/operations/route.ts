import { NextRequest, NextResponse } from "next/server";

import type { ActivityFilterCategory } from "@/lib/event-platform/event-operations/activity-constants";
import { getEventOperationsOverview } from "@/lib/event-platform/event-operations/event-operations-service";
import type { EventOperationsFilters } from "@/lib/event-platform/event-operations/event-operations-types";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { userHasEventPlatformPermission } from "@/lib/event-platform/permissions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseFilters(sp: URLSearchParams): EventOperationsFilters {
  return {
    dateFrom: sp.get("dateFrom") ?? undefined,
    dateTo: sp.get("dateTo") ?? undefined,
    userId: sp.get("userId") ?? undefined,
    activityType: sp.get("activityType") ?? undefined,
    category: (sp.get("category") as ActivityFilterCategory | "all") ?? "all",
    attendeeId: sp.get("attendeeId") ?? undefined,
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  const canManage = userHasEventPlatformPermission(actor.permissions, "events.update");
  const canAssign = canManage;

  try {
    const overview = await getEventOperationsOverview(actor.organizationId, id, {
      canManage,
      canAssign,
      filters: parseFilters(req.nextUrl.searchParams),
    });
    if (!overview) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, overview });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load operations data.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
