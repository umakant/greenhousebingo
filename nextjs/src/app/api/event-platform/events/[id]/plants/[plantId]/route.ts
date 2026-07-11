import { NextRequest, NextResponse } from "next/server";

import {
  getEventPlantDetail,
  updateEventPlant,
} from "@/lib/event-platform/event-plants/event-plant-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; plantId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, plantId } = await ctx.params;
  try {
    const detail = await getEventPlantDetail(actor.organizationId, BigInt(id), BigInt(plantId));
    if (!detail) {
      return NextResponse.json({ ok: false, message: "Plant not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load plant.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.update");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, plantId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  try {
    const plant = await updateEventPlant({
      organizationId: actor.organizationId,
      eventId: BigInt(id),
      plantId: BigInt(plantId),
      actorUserId: actor.userId,
      data: body ?? {},
    });
    if (!plant) {
      return NextResponse.json({ ok: false, message: "Plant not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, plant });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not update plant.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
