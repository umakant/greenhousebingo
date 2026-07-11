import { NextRequest, NextResponse } from "next/server";

import { getEventMarketingOverview, marketingExportCsv } from "@/lib/event-platform/event-marketing/event-marketing-service";
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
  const section = (req.nextUrl.searchParams.get("section") ?? "sources") as "sources" | "affiliates" | "promotions" | "sponsor";

  const overview = await getEventMarketingOverview(actor.organizationId, id);
  if (!overview) return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });

  const csv = marketingExportCsv(overview, section);
  const filename = `marketing-${section}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
