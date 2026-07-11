export const EVENT_BINGO_ROUND_STATUSES = [
  "scheduled",
  "ready",
  "in_progress",
  "paused",
  "winner_verification",
  "completed",
  "cancelled",
] as const;

export type EventBingoRoundStatus = (typeof EVENT_BINGO_ROUND_STATUSES)[number];

export const EVENT_BINGO_ROUND_STATUS_LABELS: Record<EventBingoRoundStatus, string> = {
  scheduled: "Scheduled",
  ready: "Ready",
  in_progress: "In Progress",
  paused: "Paused",
  winner_verification: "Winner Verification",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EVENT_BINGO_CARD_TYPES = [
  "included",
  "bonus",
  "promotional",
  "staff",
  "other",
] as const;

export type EventBingoCardType = (typeof EVENT_BINGO_CARD_TYPES)[number];

export const EVENT_BINGO_CARD_TYPE_LABELS: Record<EventBingoCardType, string> = {
  included: "Included card",
  bonus: "Bonus card",
  promotional: "Promotional card",
  staff: "Staff-issued card",
  other: "Other",
};

export const EVENT_BINGO_ROUND_ACTIONS = [
  "start",
  "pause",
  "resume",
  "complete",
  "cancel",
  "verify_winner",
] as const;

export type EventBingoRoundAction = (typeof EVENT_BINGO_ROUND_ACTIONS)[number];
