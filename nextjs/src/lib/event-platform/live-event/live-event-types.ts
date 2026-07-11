import type { EventBingoRoundDto, EventBingoWinnerDto } from "@/lib/event-platform/bingo-rounds/bingo-round-types";
import type { CommandCenterTimelineItem } from "@/lib/event-platform/command-center/command-center-types";

export type LiveEventPermissions = {
  checkIn: boolean;
  undoCheckIn: boolean;
  manageBookings: boolean;
  manageGames: boolean;
  managePayments: boolean;
  sendAnnouncements: boolean;
  addIncidents: boolean;
};

export type LiveEventKpis = {
  registered: number;
  checkedIn: number;
  remaining: number | null;
  walkIns: number;
  ticketsSoldToday: number;
  bonusCardsSoldToday: number;
  currentRoundNumber: number | null;
  winners: number;
  plantsRemaining: number;
};

export type LiveCheckInRow = {
  registrationId: string;
  name: string;
  email: string;
  ticketName: string | null;
  checkedInAt: string;
};

export type LiveExpectedAttendee = {
  registrationId: string;
  name: string;
  email: string;
  ticketName: string | null;
};

export type LiveInventoryWarning = {
  id: string;
  severity: "warning" | "critical" | "info";
  title: string;
  message: string;
};

export type LiveIncidentDto = {
  id: string;
  category: string;
  description: string;
  severity: string;
  followUpStatus: string;
  reportedByName: string | null;
  registrationId: string | null;
  createdAt: string;
};

export type LiveTicketTier = {
  id: string;
  name: string;
  price: number;
  currency: string;
  isFree: boolean;
  isBonus: boolean;
  available: boolean;
};

export type LiveEventSnapshot = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  venueName: string | null;
  hostName: string | null;
  startsAt: string;
  timezone: string;
  permissions: LiveEventPermissions;
  kpis: LiveEventKpis;
  currentRound: EventBingoRoundDto | null;
  nextRound: EventBingoRoundDto | null;
  rounds: EventBingoRoundDto[];
  recentWinners: EventBingoWinnerDto[];
  recentCheckIns: LiveCheckInRow[];
  expectedAttendees: LiveExpectedAttendee[];
  inventoryWarnings: LiveInventoryWarning[];
  schedule: CommandCenterTimelineItem[];
  staffActivity: Array<{ id: string; at: string; title: string; detail: string }>;
  incidents: LiveIncidentDto[];
  ticketTiers: LiveTicketTier[];
  bonusUnitPrice: number | null;
  currency: string;
  serverTime: string;
  pollIntervalMs: number;
};

export type WalkInInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  ticketId: string;
  quantity?: number;
  bonusCards?: number;
  paymentMethod: string;
  amount: number;
  checkInNow?: boolean;
  marketingConsent?: boolean;
};

export type BonusCardSaleInput = {
  registrationId: string;
  quantity: number;
  unitPrice: number;
  paymentMethod: string;
  discountAmount?: number;
};

export type LiveAnnouncementInput = {
  audience: "all_registered" | "checked_in" | "not_checked_in" | "staff" | "host" | "winners" | "selected";
  message: string;
  registrationIds?: string[];
  confirmed: boolean;
};

export type LiveIncidentInput = {
  category: string;
  description: string;
  severity: string;
  registrationId?: string;
};
