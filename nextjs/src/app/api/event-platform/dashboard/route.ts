import { NextRequest, NextResponse } from "next/server";

import { getEventPlatformDashboardSummary } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "reports.view");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const summary = await getEventPlatformDashboardSummary(actor.organizationId);
    return NextResponse.json({ ok: true, summary });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Dashboard failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
