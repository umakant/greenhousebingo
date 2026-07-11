import "server-only";

import type { EventBingoGame } from "@prisma/client";

import type { EventBingoGameDto, EventBingoGameStatus } from "@/lib/event-platform/bingo-games/bingo-game-types";
import type { LmsEventBingoDifficulty } from "@/lib/lms-events/event-detail-content";
import { prisma } from "@/lib/prisma";

export type { EventBingoGameDto } from "@/lib/event-platform/bingo-games/bingo-game-types";
export { EVENT_BINGO_GAME_STATUSES } from "@/lib/event-platform/bingo-games/bingo-game-types";

export function serializeEventBingoGame(row: EventBingoGame, updatedByName: string | null = null): EventBingoGameDto {
  return {
    id: row.id.toString(),
    name: row.name,
    pattern: row.pattern,
    difficulty: row.difficulty as LmsEventBingoDifficulty,
    imageUrl: row.imageUrl,
    description: row.description,
    sortOrder: row.sortOrder,
    status: row.status as EventBingoGameStatus,
    updatedByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

/** Resolve display names for the users that last touched each game. */
export async function resolveBingoGameUpdaterNames(
  rows: Array<Pick<EventBingoGame, "updatedById" | "createdById">>,
): Promise<Map<string, string>> {
  const ids = new Set<bigint>();
  for (const row of rows) {
    if (row.updatedById) ids.add(row.updatedById);
    else if (row.createdById) ids.add(row.createdById);
  }
  if (ids.size === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id.toString(), u.name ?? ""]));
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

export async function getEventBingoGameByIdForOrg(organizationId: bigint, id: bigint) {
  return prisma.eventBingoGame.findFirst({
    where: { id, organizationId },
  });
}
