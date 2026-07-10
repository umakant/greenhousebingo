import { z } from "zod";

import { LMS_EVENT_BINGO_DIFFICULTIES } from "@/lib/lms-events/event-detail-content";
import { EVENT_BINGO_GAME_STATUSES } from "@/lib/event-platform/bingo-games/bingo-game-types";

export const eventBingoGameCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255),
  pattern: z.string().trim().min(1, "Pattern is required.").max(512),
  difficulty: z.enum(LMS_EVENT_BINGO_DIFFICULTIES).default("Easy"),
  prize: z.string().trim().min(1, "Prize is required.").max(255),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(EVENT_BINGO_GAME_STATUSES).optional(),
});

export const eventBingoGameUpdateSchema = eventBingoGameCreateSchema.partial();

export type EventBingoGameCreateInput = z.infer<typeof eventBingoGameCreateSchema>;
export type EventBingoGameUpdateInput = z.infer<typeof eventBingoGameUpdateSchema>;
