export type VenueHostChartFilter = "last_5" | "last_10" | "last_12_months" | "all";

export type MetricAvailability = "available" | "not_available" | "partial";

export type VenueHostRatingInfo = {
  availability: MetricAvailability;
  label: string;
  value: number | null;
};

export type VenueCurrentDetails = {
  venueId: string | null;
  imageUrl: string | null;
  name: string | null;
  venueType: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  capacity: number | null;
  venueFee: number | null;
  contractStatus: string | null;
  paymentStatus: string | null;
  foodAndDrink: string | null;
  parking: string | null;
  accessibility: string | null;
  setupInstructions: string | null;
  businessHours: unknown | null;
  notes: string | null;
  profileUrl: string | null;
};

export type HostCurrentDetails = {
  hostId: string | null;
  photoUrl: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  invitationStatus: string | null;
  confirmationStatus: string | null;
  scheduledArrival: string | null;
  actualArrival: string | null;
  paymentType: string | null;
  paymentAmount: number | null;
  paymentStatus: string | null;
  agreementUrl: string | null;
  notes: string | null;
  profileUrl: string | null;
  invitationId: string | null;
};

export type VenueUsageMetrics = {
  timesUsed: number;
  firstEventDate: string | null;
  mostRecentEventDate: string | null;
  upcomingEventCount: number;
  completedEventCount: number;
  averageRegistrations: number | null;
  averageAttendance: number | null;
  averageCheckInRate: number | null;
  averageRevenue: number | null;
  averageExpenses: number | null;
  averageProfit: number | null;
  averageProfitMargin: number | null;
  averageBonusCardSales: number | null;
  returningCustomerRate: number | null;
  averageEventRating: VenueHostRatingInfo;
  highestPerformingEvent: { eventId: string; title: string; profit: number } | null;
  lowestPerformingEvent: { eventId: string; title: string; profit: number } | null;
};

export type HostPerformanceMetrics = {
  totalAssignedEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  averageAttendance: number | null;
  averageCheckInRate: number | null;
  averageRevenue: number | null;
  totalRevenueGenerated: number | null;
  averageProfit: number | null;
  averageBonusCardSales: number | null;
  averageEventRating: VenueHostRatingInfo;
  returningAttendeePercentage: number | null;
  onTimeArrivalPercentage: MetricAvailability;
  onTimeArrivalRate: number | null;
  totalGamesHosted: number | null;
  incidentCount: MetricAvailability;
  incidents: number | null;
};

export type VenueHistoryRow = {
  eventId: string;
  date: string;
  eventTitle: string;
  status: string;
  registered: number;
  checkedIn: number;
  capacityPct: number | null;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number | null;
  bonusCards: number;
  rating: VenueHostRatingInfo;
};

export type HostHistoryRow = {
  eventId: string;
  date: string;
  eventTitle: string;
  venueName: string | null;
  status: string;
  attendance: number;
  revenue: number;
  profit: number;
  bonusCards: number;
  rating: VenueHostRatingInfo;
  arrivalStatus: string | null;
  incidents: VenueHostRatingInfo;
};

export type VenueHostChartPoint = {
  eventId: string;
  label: string;
  attendance: number;
  revenue: number;
  profit: number;
  rating: number | null;
};

export type HostPerformanceNoteDto = {
  id: string;
  note: string;
  createdAt: string;
  createdByName: string | null;
};

export type VenueHostOverview = {
  currency: string;
  canManage: boolean;
  chartFilter: VenueHostChartFilter;
  ratingSystem: {
    available: false;
    message: string;
  };
  venue: {
    current: VenueCurrentDetails;
    metrics: VenueUsageMetrics;
    history: VenueHistoryRow[];
    charts: VenueHostChartPoint[];
  };
  host: {
    current: HostCurrentDetails;
    metrics: HostPerformanceMetrics;
    history: HostHistoryRow[];
    charts: VenueHostChartPoint[];
    performanceNotes: HostPerformanceNoteDto[];
  };
};
