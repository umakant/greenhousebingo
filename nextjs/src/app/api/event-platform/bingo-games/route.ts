import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { eventBingoGameCreateSchema } from "@/lib/event-platform/bingo-games/bingo-game-schemas";
import { listEventBingoGames, serializeEventBingoGame } from "@/lib/event-platform/bingo-games/bingo-game-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "bingoGames.view");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const rows = await listEventBingoGames(actor.organizationId);
    return NextResponse.json({ ok: true, items: rows.map(serializeEventBingoGame) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "bingoGames.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = eventBingoGameCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;

    const created = await prisma.eventBingoGame.create({
      data: {
        organizationId: actor.organizationId,
        name: p.name.trim(),
        pattern: p.pattern.trim(),
        difficulty: p.difficulty ?? "Easy",
        prize: "",
        imageUrl: p.imageUrl?.trim() || null,
        description: p.description?.trim() || null,
        sortOrder: p.sortOrder ?? 0,
        status: p.status ?? "active",
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "bingo_game.created",
      entityType: "event_bingo_game",
      entityId: created.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventBingoGame(created) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
