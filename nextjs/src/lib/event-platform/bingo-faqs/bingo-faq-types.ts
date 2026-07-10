import type { LmsEventFaq } from "@/lib/lms-events/event-detail-content";

export const EVENT_BINGO_FAQ_STATUSES = ["active", "archived"] as const;
export type EventBingoFaqStatus = (typeof EVENT_BINGO_FAQ_STATUSES)[number];

export type EventBingoFaqDto = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  status: EventBingoFaqStatus;
  createdAt: string;
  updatedAt: string | null;
};

export type EventBingoFaqsListPayload = {
  items: EventBingoFaqDto[];
};

export function bingoFaqsToEventFaqs(faqs: EventBingoFaqDto[]): LmsEventFaq[] {
  return faqs.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }));
}

export function orderBingoFaqsByIds(faqs: EventBingoFaqDto[], ids: string[]): EventBingoFaqDto[] {
  return ids.map((id) => faqs.find((f) => f.id === id)).filter((f): f is EventBingoFaqDto => Boolean(f));
}
