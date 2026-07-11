import { NextRequest, NextResponse } from "next/server";

import { getEventGamesOverview } from "@/lib/event-platform/bingo-rounds/bingo-round-service";
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
  try {
    const canManageGames = userHasEventPlatformPermission(actor.permissions, "bingoGames.manage");
    const overview = await getEventGamesOverview(actor.organizationId, id, actor.userId, {
      canManageGames,
    });
    if (!overview) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, overview });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load games.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
