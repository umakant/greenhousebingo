import { NextRequest, NextResponse } from "next/server";

import { importPlantsFromCsv } from "@/lib/event-platform/event-plants/event-plant-service";
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
  const body = (await req.json().catch(() => null)) as { csv?: string } | null;
  if (!body?.csv?.trim()) {
    return NextResponse.json({ ok: false, message: "CSV content is required." }, { status: 400 });
  }

  const result = await importPlantsFromCsv({
    organizationId: actor.organizationId,
    eventId: BigInt(id),
    csv: body.csv,
    actorUserId: actor.userId,
  });

  return NextResponse.json({ ok: true, ...result });
}
