import type { EventBingoCardType, EventBingoRoundStatus } from "@/lib/event-platform/bingo-rounds/bingo-round-constants";

export type EventBingoRoundDto = {
  id: string;
  eventId: string;
  roundNumber: number;
  bingoGameId: string | null;
  name: string;
  pattern: string;
  difficulty: string;
  assignedPrize: string;
  prizeCost: number | null;
  prizeRetailValue: number | null;
  scheduledAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  status: EventBingoRoundStatus;
  primaryWinner: EventBingoWinnerDto | null;
  winnerCount: number;
};

export type EventBingoWinnerDto = {
  id: string;
  eventId: string;
  roundInstanceId: string;
  roundNumber: number;
  registrationId: string;
  attendeeName: string;
  attendeeEmail: string;
  winningCardNumber: string;
  cardType: EventBingoCardType;
  prizeLabel: string;
  prizeCost: number | null;
  prizeRetailValue: number | null;
  verified: boolean;
  verifiedAt: string | null;
  verifiedByName: string | null;
  verificationNotes: string | null;
  winnerPhotoUrl: string | null;
  notes: string | null;
  checkInStatus: "checked_in" | "not_checked_in" | "no_show";
  bookingStatus: string;
  ticketName: string | null;
  customerType: string | null;
  createdAt: string;
};

export type EventGamesSummary = {
  totalRounds: number;
  completedRounds: number;
  upcomingRounds: number;
  inProgressRounds: number;
  totalWinners: number;
  uniqueWinners: number;
  repeatWinners: number;
  prizesAwarded: number;
  totalPrizeCost: number;
  totalPrizeRetailValue: number;
};

export type EventGamesAnalytics = {
  winsByCardType: Array<{ key: string; label: string; count: number }>;
  winsByTicketTier: Array<{ key: string; label: string; count: number }>;
  winsByCustomerType: Array<{ key: string; label: string; count: number }>;
  newVsReturning: { new: number; returning: number };
  uniqueVsRepeat: { unique: number; repeat: number };
  winsByPattern: Array<{ key: string; label: string; count: number }>;
};

export type EventGamesActivityItem = {
  id: string;
  at: string;
  action: string;
  title: string;
  detail: string;
};

export type EventGamesOverview = {
  summary: EventGamesSummary;
  rounds: EventBingoRoundDto[];
  winners: EventBingoWinnerDto[];
  analytics: EventGamesAnalytics;
  activity: EventGamesActivityItem[];
  currentRoundId: string | null;
  canManageGames: boolean;
};

export type RecordWinnerInput = {
  roundInstanceId: string;
  registrationId: string;
  winningCardNumber: string;
  cardType: EventBingoCardType;
  prizeLabel: string;
  prizeCost?: number | null;
  prizeRetailValue?: number | null;
  winnerPhotoUrl?: string | null;
  verified?: boolean;
  notes?: string | null;
};

export type RecordWinnerValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type RecordWinnerResult = {
  winner: EventBingoWinnerDto;
  validation: RecordWinnerValidation;
};
