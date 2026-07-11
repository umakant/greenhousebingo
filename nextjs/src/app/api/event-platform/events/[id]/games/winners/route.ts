import { NextRequest, NextResponse } from "next/server";

import { EVENT_BINGO_CARD_TYPES } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import type { EventBingoCardType } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";
import { recordEventBingoWinner } from "@/lib/event-platform/bingo-rounds/bingo-round-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "bingoGames.manage");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  let eventId: bigint;
  try {
    eventId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid event." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    roundInstanceId?: string;
    registrationId?: string;
    winningCardNumber?: string;
    cardType?: string;
    prizeLabel?: string;
    prizeCost?: number | null;
    prizeRetailValue?: number | null;
    winnerPhotoUrl?: string | null;
    verified?: boolean;
    notes?: string | null;
    force?: boolean;
  } | null;

  if (!body?.roundInstanceId || !body.registrationId || !body.winningCardNumber) {
    return NextResponse.json({ ok: false, message: "Missing required fields." }, { status: 400 });
  }

  const cardType = (body.cardType ?? "included") as EventBingoCardType;
  if (!EVENT_BINGO_CARD_TYPES.includes(cardType)) {
    return NextResponse.json({ ok: false, message: "Invalid card type." }, { status: 400 });
  }

  try {
    const result = await recordEventBingoWinner({
      organizationId: actor.organizationId,
      eventId,
      actorUserId: actor.userId,
      force: Boolean(body.force),
      data: {
        roundInstanceId: body.roundInstanceId,
        registrationId: body.registrationId,
        winningCardNumber: body.winningCardNumber,
        cardType,
        prizeLabel: body.prizeLabel ?? "",
        prizeCost: body.prizeCost,
        prizeRetailValue: body.prizeRetailValue,
        winnerPhotoUrl: body.winnerPhotoUrl,
        verified: body.verified,
        notes: body.notes,
      },
    });

    if ("error" in result) {
      return NextResponse.json(
        { ok: false, message: result.error, validation: result.validation },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not record winner.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
