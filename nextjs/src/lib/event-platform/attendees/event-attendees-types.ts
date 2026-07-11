import type { CommandCenterMetricAvailability } from "@/lib/event-platform/command-center/command-center-types";

export type EventAttendeeCustomerType =
  | "new"
  | "returning"
  | "vip"
  | "affiliate_referral"
  | "venue_customer"
  | "walk_in";

export type EventAttendeeBonusTier = "none" | "buyer" | "above_average" | "power_buyer";

export type EventAttendeeCheckInStatus = "checked_in" | "not_checked_in" | "no_show";

export type EventAttendeePlantRequest = {
  availability: CommandCenterMetricAvailability;
  value: string | null;
};

export type EventAttendeeBonusInfo = {
  tier: EventAttendeeBonusTier;
  count: number;
  revenue: number;
  eventAverage: number | null;
  showBadge: boolean;
};

export type EventAttendeeRow = {
  registrationId: string;
  studentUserId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  initials: string;
  bookingStatus: string;
  checkInStatus: EventAttendeeCheckInStatus;
  checkedInAt: string | null;
  ticketId: string | null;
  ticketName: string;
  ticketQuantity: number;
  includedCards: number;
  bonusCards: number;
  totalCards: number;
  bingoWins: CommandCenterMetricAvailability;
  bingoWinCount: number;
  totalSpend: number;
  currency: string;
  plantRequest: EventAttendeePlantRequest;
  registrationSource: string;
  customerType: EventAttendeeCustomerType;
  bonus: EventAttendeeBonusInfo;
  registeredAt: string;
  qrToken: string;
  priorEventsRegistered: number;
  priorEventsAttended: number;
};

export type EventAttendeesSummary = {
  totalAttendees: number;
  checkedIn: number;
  notCheckedIn: number;
  newAttendees: number;
  returningAttendees: number;
  walkIns: CommandCenterMetricAvailability;
  walkInCount: number | null;
  bonusCardBuyers: number;
  bingoWinners: CommandCenterMetricAvailability;
  bingoWinnerCount: number | null;
  noShows: number;
  bonusCardEventAverage: number | null;
};

export type EventAttendeeSortField =
  | "bonus_cards"
  | "spend"
  | "bingo_wins"
  | "events_attended"
  | "registered_at"
  | "name";

export type EventAttendeesListQuery = {
  page?: number;
  pageSize?: 25 | 50 | 100 | 5000;
  q?: string;
  phone?: string;
  email?: string;
  registrationStatus?: string;
  checkInStatus?: EventAttendeeCheckInStatus | "all";
  customerType?: EventAttendeeCustomerType | "all";
  ticketTierId?: string;
  bonusCardBuyer?: "true" | "false" | "all";
  bingoWinner?: "true" | "false" | "all";
  hasPlantRequest?: "true" | "false" | "all";
  registrationSource?: string;
  spendMin?: number;
  spendMax?: number;
  newOrReturning?: "new" | "returning" | "all";
  sort?: EventAttendeeSortField;
  sortDir?: "asc" | "desc";
};

export type EventAttendeesListResult = {
  summary: EventAttendeesSummary;
  rows: EventAttendeeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  ticketTiers: Array<{ id: string; name: string }>;
  registrationSources: string[];
};

export type EventAttendeeActivityItem = {
  id: string;
  at: string;
  kind: "registration" | "payment" | "check_in" | "bonus" | "win" | "message";
  title: string;
  detail: string;
};

export type EventAttendeeDetail = {
  row: EventAttendeeRow;
  notes: string | null;
  lifetime: {
    totalEventsRegistered: number;
    totalEventsAttended: number;
    lifetimeSpend: number;
    lifetimeBonusCards: number;
    lifetimeBingoWins: CommandCenterMetricAvailability;
    lifetimeBingoWinCount: number | null;
    plantsWon: CommandCenterMetricAvailability;
    plantsWonCount: number | null;
    favoriteVenue: string | null;
    favoritePlant: CommandCenterMetricAvailability;
    referralCount: number;
    lastEventAttended: string | null;
  };
  activity: EventAttendeeActivityItem[];
};
