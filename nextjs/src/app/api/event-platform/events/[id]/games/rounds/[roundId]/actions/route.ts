import { NextRequest, NextResponse } from "next/server";

import type { EventBingoRoundAction } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import { EVENT_BINGO_ROUND_ACTIONS } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import { applyRoundAction } from "@/lib/event-platform/bingo-rounds/bingo-round-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; roundId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "bingoGames.manage");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, roundId } = await ctx.params;
  let eventId: bigint;
  let roundIdBig: bigint;
  try {
    eventId = BigInt(id);
    roundIdBig = BigInt(roundId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid event or round." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    assignedPrize?: string;
    prizeCost?: number | null;
    prizeRetailValue?: number | null;
  } | null;

  const action = body?.action as EventBingoRoundAction;
  if (!action || !EVENT_BINGO_ROUND_ACTIONS.includes(action)) {
    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  }

  try {
    const round = await applyRoundAction({
      organizationId: actor.organizationId,
      eventId,
      roundId: roundIdBig,
      action,
      actorUserId: actor.userId,
      prizePatch: {
        assignedPrize: body?.assignedPrize,
        prizeCost: body?.prizeCost,
        prizeRetailValue: body?.prizeRetailValue,
      },
    });
    if (!round) {
      return NextResponse.json({ ok: false, message: "Round not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, round });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Action failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
