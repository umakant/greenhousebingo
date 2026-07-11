import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { eventBingoGameUpdateSchema } from "@/lib/event-platform/bingo-games/bingo-game-schemas";
import { getEventBingoGameById, getEventBingoGameByIdForOrg, serializeEventBingoGame } from "@/lib/event-platform/bingo-games/bingo-game-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "bingoGames.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid bingo game id." }, { status: 400 });
    }

    const existing = await getEventBingoGameById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Bingo game not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = eventBingoGameUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;

    const updated = await prisma.eventBingoGame.update({
      where: { id: existing.id },
      data: {
        name: p.name?.trim() ?? undefined,
        pattern: p.pattern?.trim() ?? undefined,
        difficulty: p.difficulty ?? undefined,
        imageUrl: p.imageUrl !== undefined ? p.imageUrl?.trim() || null : undefined,
        description: p.description !== undefined ? p.description?.trim() || null : undefined,
        sortOrder: p.sortOrder ?? undefined,
        status: p.status ?? undefined,
        archivedAt: p.status === "archived" ? new Date() : p.status === "active" ? null : undefined,
        updatedById: actor.userId,
        updatedAt: new Date(),
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "bingo_game.updated",
      entityType: "event_bingo_game",
      entityId: updated.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventBingoGame(updated) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "bingoGames.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid bingo game id." }, { status: 400 });
    }

    const existing = permanent
      ? await getEventBingoGameByIdForOrg(actor.organizationId, id)
      : await getEventBingoGameById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Bingo game not found." }, { status: 404 });
    }

    if (permanent) {
      await prisma.eventBingoGame.delete({ where: { id: existing.id } });
      await writeEventAuditLog({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "bingo_game.deleted",
        entityType: "event_bingo_game",
        entityId: existing.id.toString(),
      });
      return NextResponse.json({ ok: true });
    }

    await prisma.eventBingoGame.update({
      where: { id: existing.id },
      data: { status: "archived", archivedAt: new Date(), updatedById: actor.userId, updatedAt: new Date() },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "bingo_game.archived",
      entityType: "event_bingo_game",
      entityId: existing.id.toString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";
    const message = e instanceof Error ? e.message : permanent ? "Delete failed." : "Archive failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
