import "server-only";

import type { EventBingoGame } from "@prisma/client";

import type { EventBingoGameDto, EventBingoGameStatus } from "@/lib/event-platform/bingo-games/bingo-game-types";
import type { LmsEventBingoDifficulty } from "@/lib/lms-events/event-detail-content";
import { prisma } from "@/lib/prisma";

export type { EventBingoGameDto } from "@/lib/event-platform/bingo-games/bingo-game-types";
export { EVENT_BINGO_GAME_STATUSES } from "@/lib/event-platform/bingo-games/bingo-game-types";

export function serializeEventBingoGame(row: EventBingoGame): EventBingoGameDto {
  return {
    id: row.id.toString(),
    name: row.name,
    pattern: row.pattern,
    difficulty: row.difficulty as LmsEventBingoDifficulty,
    prize: row.prize,
    description: row.description,
    sortOrder: row.sortOrder,
    status: row.status as EventBingoGameStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export async function listEventBingoGames(organizationId: bigint, includeArchived = false) {
  return prisma.eventBingoGame.findMany({
    where: {
      organizationId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getEventBingoGameById(organizationId: bigint, id: bigint) {
  return prisma.eventBingoGame.findFirst({
    where: { id, organizationId, archivedAt: null },
  });
}
