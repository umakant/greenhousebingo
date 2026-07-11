import { NextRequest, NextResponse } from "next/server";

import { createPlantRequest } from "@/lib/event-platform/event-plants/event-plant-service";
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
  const body = (await req.json().catch(() => null)) as {
    registrationId?: string;
    eventPlantId?: string | null;
    requestedPlantName?: string | null;
    priority?: number | null;
    notes?: string | null;
  } | null;

  if (!body?.registrationId?.trim()) {
    return NextResponse.json({ ok: false, message: "Registration is required." }, { status: 400 });
  }

  const result = await createPlantRequest({
    organizationId: actor.organizationId,
    eventId: BigInt(id),
    actorUserId: actor.userId,
    data: {
      registrationId: body.registrationId.trim(),
      eventPlantId: body.eventPlantId,
      requestedPlantName: body.requestedPlantName,
      priority: body.priority,
      notes: body.notes,
    },
  });

  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, request: result });
}
