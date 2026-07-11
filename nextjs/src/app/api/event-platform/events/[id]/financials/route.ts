import { NextRequest, NextResponse } from "next/server";

import { getEventFinancialsOverview } from "@/lib/event-platform/event-financials/event-financials-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { userHasEventPlatformPermission } from "@/lib/event-platform/permissions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  const canManage =
    userHasEventPlatformPermission(actor.permissions, "events.update") ||
    userHasEventPlatformPermission(actor.permissions, "payments.manage");

  try {
    const overview = await getEventFinancialsOverview(actor.organizationId, id, {
      canManageFinancials: canManage,
    });
    if (!overview) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, overview });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load financials.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
