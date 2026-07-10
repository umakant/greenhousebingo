import type { LmsEventBingoDifficulty, LmsEventBingoRound } from "@/lib/lms-events/event-detail-content";

export const EVENT_BINGO_GAME_STATUSES = ["active", "archived"] as const;
export type EventBingoGameStatus = (typeof EVENT_BINGO_GAME_STATUSES)[number];

export type EventBingoGameDto = {
  id: string;
  name: string;
  pattern: string;
  difficulty: LmsEventBingoDifficulty;
  prize: string;
  description: string | null;
  sortOrder: number;
  status: EventBingoGameStatus;
  createdAt: string;
  updatedAt: string | null;
};

export type EventBingoGamesListPayload = {
  items: EventBingoGameDto[];
};

export function bingoGamesToRounds(games: EventBingoGameDto[]): LmsEventBingoRound[] {
  return games.map((game, index) => ({
    roundNumber: index + 1,
    name: game.name,
    pattern: game.pattern,
    difficulty: game.difficulty,
    prize: game.prize,
  }));
}

export function orderBingoGamesByIds(games: EventBingoGameDto[], ids: string[]): EventBingoGameDto[] {
  return ids.map((id) => games.find((g) => g.id === id)).filter((g): g is EventBingoGameDto => Boolean(g));
}
