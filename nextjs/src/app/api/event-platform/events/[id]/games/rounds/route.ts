import { NextRequest, NextResponse } from "next/server";

import { createEventBingoRound } from "@/lib/event-platform/bingo-rounds/bingo-round-service";
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
    name?: string;
    pattern?: string;
    difficulty?: string;
    assignedPrize?: string;
    prizeCost?: number | null;
    prizeRetailValue?: number | null;
    scheduledAt?: string | null;
  } | null;

  if (!body?.name?.trim() || !body?.pattern?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Round name and pattern / rule are required." },
      { status: 400 },
    );
  }

  try {
    const round = await createEventBingoRound({
      organizationId: actor.organizationId,
      eventId,
      actorUserId: actor.userId,
      name: body.name,
      pattern: body.pattern,
      difficulty: body.difficulty ?? "Easy",
      assignedPrize: body.assignedPrize ?? "",
      prizeCost: typeof body.prizeCost === "number" ? body.prizeCost : null,
      prizeRetailValue: typeof body.prizeRetailValue === "number" ? body.prizeRetailValue : null,
      scheduledAt: body.scheduledAt ?? null,
    });
    return NextResponse.json({ ok: true, round });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not add round.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
