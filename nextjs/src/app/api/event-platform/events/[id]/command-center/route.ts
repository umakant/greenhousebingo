import { NextRequest, NextResponse } from "next/server";

import { getEventCommandCenterSummary } from "@/lib/event-platform/command-center/command-center-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseRegTrend(value: string | null): number | "all" {
  if (!value || value === "30") return 30;
  if (value === "7") return 7;
  if (value === "all") return "all";
  const n = Number.parseInt(value, 10);
  if (n === 7 || n === 30) return n;
  return 30;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  const regTrend = parseRegTrend(req.nextUrl.searchParams.get("regTrend"));

  try {
    const summary = await getEventCommandCenterSummary(actor.organizationId, id, {
      registrationTrendDays: regTrend,
    });
    if (!summary) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, summary });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load event summary.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
