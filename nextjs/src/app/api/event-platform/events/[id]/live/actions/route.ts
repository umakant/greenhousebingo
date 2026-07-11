import { NextRequest, NextResponse } from "next/server";

import {
  resolveLivePermissions,
  runLiveEventAction,
} from "@/lib/event-platform/live-event/live-event-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  let eventId: bigint;
  try {
    eventId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid event." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action as string | undefined;
  if (!action) return NextResponse.json({ ok: false, message: "Action required." }, { status: 400 });

  const permissions = resolveLivePermissions(actor.permissions);

  try {
    const result = await runLiveEventAction({
      organizationId: actor.organizationId,
      eventId,
      actorUserId: actor.userId,
      permissions,
      action,
      body: body ?? {},
    });
    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: result.message, data: result.data });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Action failed." }, { status: 400 });
  }
}
