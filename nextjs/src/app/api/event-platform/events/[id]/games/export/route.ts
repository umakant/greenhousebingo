import { NextRequest, NextResponse } from "next/server";

import { bingoWinnersToCsv, getEventGamesOverview } from "@/lib/event-platform/bingo-rounds/bingo-round-service";
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
  const section = req.nextUrl.searchParams.get("section") ?? "winners";

  const overview = await getEventGamesOverview(actor.organizationId, id);
  if (!overview) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }

  if (section === "winners") {
    const csv = bingoWinnersToCsv(overview.winners);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="event-${id}-winners.csv"`,
      },
    });
  }

  return NextResponse.json({ ok: false, message: "Unknown section." }, { status: 400 });
}
