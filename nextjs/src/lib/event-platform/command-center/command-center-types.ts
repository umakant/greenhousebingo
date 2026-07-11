/** Availability for metrics whose data source may be missing or empty. */
export type CommandCenterMetricAvailability = "available" | "no_records" | "not_configured";

export type CommandCenterNumericMetric = {
  availability: CommandCenterMetricAvailability;
  value: number | null;
};

export type CommandCenterEventSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
  eventType: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  doorsOpen: string | null;
  bingoStart: string | null;
  bingoEnd: string | null;
  capacity: number | null;
  venue: {
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    type: string | null;
  };
  host: {
    name: string | null;
    bio: string | null;
    imageUrl: string | null;
    invitationStatus: string | null;
  };
  description: string | null;
  shortDescription: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  isFree: boolean;
  currency: string;
  ageRule: string | null;
  cardsIncluded: number | null;
  extraCardPrice: number | null;
  foodAndDrinks: string | null;
  attire: string | null;
  priceFrom: number | null;
  detailContent: import("@/lib/lms-events/event-detail-content").LmsEventDetailContent | null;
};

export type CommandCenterCounts = {
  registrations: number;
  ticketQuantity: number;
  checkedIn: number;
  notCheckedIn: number;
  walkIns: CommandCenterNumericMetric;
  remainingCapacity: CommandCenterNumericMetric;
  games: number;
  plants: CommandCenterNumericMetric;
  activityItems: number;
};

export type CommandCenterFinancialBreakdown = {
  ticketRevenue: CommandCenterNumericMetric;
  bonusCardRevenue: CommandCenterNumericMetric;
  sponsorRevenue: CommandCenterNumericMetric;
  otherRevenue: CommandCenterNumericMetric;
  grossRevenue: CommandCenterNumericMetric;
  totalExpenses: CommandCenterNumericMetric;
  netProfit: CommandCenterNumericMetric;
  profitMargin: CommandCenterNumericMetric;
};

export type CommandCenterOperations = {
  hostConfirmed: boolean;
  hostConfirmedSource: "invitation" | "assigned" | "none";
  venueConfirmed: CommandCenterMetricAvailability;
  gamesReady: boolean;
  plantInventoryReady: CommandCenterMetricAvailability;
  paymentsOutstanding: number;
  checklistCompletion: CommandCenterMetricAvailability;
};

export type CommandCenterHealthFactor = {
  id: string;
  label: string;
  weight: number;
  earned: number;
  max: number;
  availability: CommandCenterMetricAvailability;
  detail: string;
  action?: string;
};

export type CommandCenterHealth = {
  score: number;
  status: "excellent" | "on_track" | "needs_attention" | "at_risk";
  statusLabel: string;
  factors: CommandCenterHealthFactor[];
  recommendedAction: string;
};

export type CommandCenterAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  actionLabel: string;
  actionKind: "edit" | "check_in" | "hosts" | "games" | "financials" | "none";
  dismissible?: boolean;
  explanation?: string;
  recommendedAction?: string;
};

export type CommandCenterRegistrationTrendPoint = {
  date: string;
  label: string;
  daily: number;
  cumulative: number;
};

export type CommandCenterCheckInTrendPoint = {
  hour: string;
  label: string;
  checkIns: number;
  walkIns: number;
};

export type CommandCenterActivityItem = {
  id: string;
  at: string;
  title: string;
  detail: string;
  kind: "check_in" | "registration" | "audit" | "other";
};

export type CommandCenterTimelineItem = {
  id: string;
  label: string;
  time: string | null;
  sortAt: string | null;
  status: "upcoming" | "current" | "past" | "unknown";
};

export type CommandCenterCharts = {
  registrationTrend: {
    rangeDays: number | "all";
    capacityTarget: number | null;
    points: CommandCenterRegistrationTrendPoint[];
  };
  checkInTrend: {
    preEvent: boolean;
    eventStarted: boolean;
    points: CommandCenterCheckInTrendPoint[];
    remainingExpected: number;
  };
  revenueVsExpenses: {
    revenue: Array<{ key: string; label: string; metric: CommandCenterNumericMetric }>;
    expenses: Array<{ key: string; label: string; metric: CommandCenterNumericMetric }>;
  };
};

export type EventCommandCenterSummary = {
  event: CommandCenterEventSummary;
  counts: CommandCenterCounts;
  financial: CommandCenterFinancialBreakdown;
  operations: CommandCenterOperations;
  health: CommandCenterHealth;
  alerts: CommandCenterAlert[];
  charts: CommandCenterCharts;
  timeline: CommandCenterTimelineItem[];
  recentActivity: CommandCenterActivityItem[];
};

export type EventCommandCenterSummaryOptions = {
  registrationTrendDays?: number | "all";
};
