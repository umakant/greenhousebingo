import { NextRequest, NextResponse } from "next/server";

import {
  getEventPlantsOverview,
  createEventPlant,
  seedPlantsFromBingoRounds,
} from "@/lib/event-platform/event-plants/event-plant-service";
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
  const canManagePlants = userHasEventPlatformPermission(actor.permissions, "events.update");
  try {
    const overview = await getEventPlantsOverview(actor.organizationId, id, { canManagePlants });
    if (!overview) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, overview });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load plants.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

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

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    name?: string;
    category?: string | null;
    variety?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    eventVendorId?: string | null;
    posProductId?: string | null;
    quantityPurchased?: number;
    unitCost?: number;
    retailValue?: number | null;
    notes?: string | null;
  } | null;

  try {
    if (body?.action === "seed_from_rounds") {
      const created = await seedPlantsFromBingoRounds(actor.organizationId, eventId, actor.userId);
      return NextResponse.json({ ok: true, created });
    }

    if (!body?.name?.trim()) {
      return NextResponse.json({ ok: false, message: "Plant name is required." }, { status: 400 });
    }

    const plant = await createEventPlant({
      organizationId: actor.organizationId,
      eventId,
      actorUserId: actor.userId,
      data: {
        name: body.name.trim(),
        category: body.category,
        variety: body.variety,
        description: body.description,
        imageUrl: body.imageUrl,
        eventVendorId: body.eventVendorId,
        posProductId: body.posProductId,
        quantityPurchased: body.quantityPurchased,
        unitCost: body.unitCost,
        retailValue: body.retailValue,
        notes: body.notes,
      },
    });
    if (!plant) {
      return NextResponse.json({ ok: false, message: "Could not create plant." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, plant });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not save plant.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
