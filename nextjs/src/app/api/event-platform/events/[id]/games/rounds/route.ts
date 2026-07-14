import { NextRequest, NextResponse } from "next/server";

import {
  createEventBingoRound,
  createEventBingoRoundsBulk,
} from "@/lib/event-platform/bingo-rounds/bingo-round-service";
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
    rounds?: Array<{
      name?: string;
      pattern?: string;
      difficulty?: string;
      assignedPrize?: string;
      prizeCost?: number | null;
      prizeRetailValue?: number | null;
      scheduledAt?: string | null;
    }>;
  } | null;

  // Bulk generation path (used by the "Randomize" games generator).
  if (Array.isArray(body?.rounds)) {
    const cleaned = body.rounds
      .map((r) => ({
        name: r.name?.trim() ?? "",
        pattern: r.pattern?.trim() ?? "",
        difficulty: r.difficulty ?? "Easy",
        assignedPrize: r.assignedPrize ?? "",
        prizeCost: typeof r.prizeCost === "number" ? r.prizeCost : null,
        prizeRetailValue: typeof r.prizeRetailValue === "number" ? r.prizeRetailValue : null,
        scheduledAt: r.scheduledAt ?? null,
      }))
      .filter((r) => r.name && r.pattern);
    if (cleaned.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No valid rounds to generate." },
        { status: 400 },
      );
    }
    try {
      const result = await createEventBingoRoundsBulk({
        organizationId: actor.organizationId,
        eventId,
        actorUserId: actor.userId,
        rounds: cleaned,
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not generate rounds.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }
  }

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
