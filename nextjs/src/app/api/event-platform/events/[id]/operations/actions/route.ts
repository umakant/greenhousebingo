import { NextRequest, NextResponse } from "next/server";

import { runEventOperationsAction } from "@/lib/event-platform/event-operations/event-operations-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.update");
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

  try {
    const result = await runEventOperationsAction({
      organizationId: actor.organizationId,
      eventId,
      actorUserId: actor.userId,
      action,
      body: body ?? {},
    });
    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Action failed." }, { status: 400 });
  }
}
