import { z } from "zod";

import { EVENT_BINGO_FAQ_STATUSES } from "@/lib/event-platform/bingo-faqs/bingo-faq-types";

export const eventBingoFaqCreateSchema = z.object({
  question: z.string().trim().min(1, "Question is required.").max(512),
  answer: z.string().trim().min(1, "Answer is required.").max(10000),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(EVENT_BINGO_FAQ_STATUSES).optional(),
});

export const eventBingoFaqUpdateSchema = eventBingoFaqCreateSchema.partial();

export type EventBingoFaqCreateInput = z.infer<typeof eventBingoFaqCreateSchema>;
export type EventBingoFaqUpdateInput = z.infer<typeof eventBingoFaqUpdateSchema>;
