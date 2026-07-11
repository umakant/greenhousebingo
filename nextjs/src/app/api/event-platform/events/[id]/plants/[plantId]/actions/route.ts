import { NextRequest, NextResponse } from "next/server";

import type { EventPlantAction } from "@/lib/event-platform/event-plants/event-plant-constants";
import {
  addPlantQuantity,
  assignPlantToGame,
  duplicateEventPlant,
  markPlantsAwarded,
  removePlantAssignment,
  removePlantFromEvent,
} from "@/lib/event-platform/event-plants/event-plant-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; plantId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.update");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, plantId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    action?: EventPlantAction;
    quantity?: number;
    roundInstanceId?: string;
    assignmentId?: string;
  } | null;

  const action = body?.action;
  if (!action) {
    return NextResponse.json({ ok: false, message: "Action is required." }, { status: 400 });
  }

  const eventId = BigInt(id);
  const pid = BigInt(plantId);

  try {
    switch (action) {
      case "add_quantity": {
        const plant = await addPlantQuantity({
          organizationId: actor.organizationId,
          eventId,
          plantId: pid,
          quantity: body?.quantity ?? 0,
          actorUserId: actor.userId,
        });
        if (!plant) return NextResponse.json({ ok: false, message: "Plant not found." }, { status: 404 });
        return NextResponse.json({ ok: true, plant });
      }
      case "assign_to_game": {
        if (!body?.roundInstanceId) {
          return NextResponse.json({ ok: false, message: "Round is required." }, { status: 400 });
        }
        const assignment = await assignPlantToGame({
          organizationId: actor.organizationId,
          eventId,
          plantId: pid,
          roundInstanceId: body.roundInstanceId,
          quantity: body.quantity,
          actorUserId: actor.userId,
        });
        if (!assignment) {
          return NextResponse.json({ ok: false, message: "Could not assign plant." }, { status: 404 });
        }
        return NextResponse.json({ ok: true, assignment });
      }
      case "remove_assignment": {
        if (!body?.assignmentId) {
          return NextResponse.json({ ok: false, message: "Assignment ID is required." }, { status: 400 });
        }
        const ok = await removePlantAssignment({
          organizationId: actor.organizationId,
          eventId,
          assignmentId: BigInt(body.assignmentId),
          actorUserId: actor.userId,
        });
        return NextResponse.json({ ok });
      }
      case "mark_awarded": {
        const plant = await markPlantsAwarded({
          organizationId: actor.organizationId,
          eventId,
          plantId: pid,
          quantity: body?.quantity ?? 1,
          actorUserId: actor.userId,
        });
        if (!plant) return NextResponse.json({ ok: false, message: "Plant not found." }, { status: 404 });
        return NextResponse.json({ ok: true, plant });
      }
      case "remove_from_event": {
        const ok = await removePlantFromEvent({
          organizationId: actor.organizationId,
          eventId,
          plantId: pid,
          actorUserId: actor.userId,
        });
        return NextResponse.json({ ok });
      }
      case "duplicate": {
        const plant = await duplicateEventPlant({
          organizationId: actor.organizationId,
          eventId,
          plantId: pid,
          actorUserId: actor.userId,
        });
        if (!plant) return NextResponse.json({ ok: false, message: "Plant not found." }, { status: 404 });
        return NextResponse.json({ ok: true, plant });
      }
      default:
        return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Action failed.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
