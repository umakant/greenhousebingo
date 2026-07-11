import { NextRequest, NextResponse } from "next/server";

import {
  eventFinancialsSummaryToCsv,
  eventFinancialsToCsv,
  getEventFinancialsOverview,
} from "@/lib/event-platform/event-financials/event-financials-service";
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
  const overview = await getEventFinancialsOverview(actor.organizationId, id);
  if (!overview) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }

  const section = req.nextUrl.searchParams.get("section") ?? "lines";
  const csv =
    section === "summary" ? eventFinancialsSummaryToCsv(overview) : eventFinancialsToCsv(overview.lines);
  const filename = section === "summary" ? `event-${id}-financial-summary.csv` : `event-${id}-pnl.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
