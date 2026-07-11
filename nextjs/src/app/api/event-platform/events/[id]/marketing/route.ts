import { NextRequest, NextResponse } from "next/server";

import { getEventMarketingOverview } from "@/lib/event-platform/event-marketing/event-marketing-service";
import type { EventMarketingFilters } from "@/lib/event-platform/event-marketing/event-marketing-types";
import type { RegistrationSourceType } from "@/lib/event-platform/event-marketing/attribution-constants";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { userHasEventPlatformPermission } from "@/lib/event-platform/permissions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseFilters(sp: URLSearchParams): EventMarketingFilters {
  return {
    dateFrom: sp.get("dateFrom") ?? undefined,
    dateTo: sp.get("dateTo") ?? undefined,
    source: (sp.get("source") as RegistrationSourceType | "all") ?? "all",
    campaign: sp.get("campaign") ?? undefined,
    affiliateId: sp.get("affiliateId") ?? undefined,
    promotionCode: sp.get("promotionCode") ?? undefined,
    checkInStatus: (sp.get("checkInStatus") as EventMarketingFilters["checkInStatus"]) ?? "all",
    ticketTierId: sp.get("ticketTierId") ?? undefined,
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  const canManage =
    userHasEventPlatformPermission(actor.permissions, "events.update") ||
    userHasEventPlatformPermission(actor.permissions, "commissions.manage");

  try {
    const overview = await getEventMarketingOverview(actor.organizationId, id, {
      canManage,
      filters: parseFilters(req.nextUrl.searchParams),
    });
    if (!overview) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, overview });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load marketing data.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
