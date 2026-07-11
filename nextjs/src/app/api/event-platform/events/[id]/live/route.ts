import { NextRequest, NextResponse } from "next/server";

import {
  getLiveEventSnapshot,
  resolveLivePermissions,
} from "@/lib/event-platform/live-event/live-event-service";
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
  const permissions = resolveLivePermissions(actor.permissions);

  try {
    const snapshot = await getLiveEventSnapshot(actor.organizationId, id, permissions);
    if (!snapshot) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, snapshot });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not load live data." },
      { status: 500 },
    );
  }
}
