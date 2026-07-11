import { NextRequest, NextResponse } from "next/server";

import { verifyEventBingoWinner } from "@/lib/event-platform/bingo-rounds/bingo-round-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; winnerId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "bingoGames.manage");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, winnerId } = await ctx.params;
  let eventId: bigint;
  let winnerIdBig: bigint;
  try {
    eventId = BigInt(id);
    winnerIdBig = BigInt(winnerId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid IDs." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    verificationNotes?: string | null;
    completeRound?: boolean;
  } | null;

  try {
    const winner = await verifyEventBingoWinner({
      organizationId: actor.organizationId,
      eventId,
      winnerId: winnerIdBig,
      actorUserId: actor.userId,
      verificationNotes: body?.verificationNotes,
      completeRound: body?.completeRound,
    });
    if (!winner) {
      return NextResponse.json({ ok: false, message: "Winner not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, winner });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Verification failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
