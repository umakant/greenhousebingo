import "server-only";

import type { EventBingoFaq } from "@prisma/client";

import type { EventBingoFaqDto, EventBingoFaqStatus } from "@/lib/event-platform/bingo-faqs/bingo-faq-types";
import { prisma } from "@/lib/prisma";

export type { EventBingoFaqDto } from "@/lib/event-platform/bingo-faqs/bingo-faq-types";
export { EVENT_BINGO_FAQ_STATUSES } from "@/lib/event-platform/bingo-faqs/bingo-faq-types";

export function serializeEventBingoFaq(row: EventBingoFaq): EventBingoFaqDto {
  return {
    id: row.id.toString(),
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
    status: row.status as EventBingoFaqStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export async function listEventBingoFaqs(organizationId: bigint, includeArchived = false) {
  return prisma.eventBingoFaq.findMany({
    where: {
      organizationId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
  });
}

export async function getEventBingoFaqById(organizationId: bigint, id: bigint) {
  return prisma.eventBingoFaq.findFirst({
    where: { id, organizationId, archivedAt: null },
  });
}
