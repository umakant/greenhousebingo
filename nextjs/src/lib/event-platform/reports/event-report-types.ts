import type { PostEventScorecard } from "@/lib/event-platform/reports/post-event-scorecard";

export type EventReportData = {
  generatedAt: string;
  eventId: string;
  eventSummary: {
    name: string;
    date: string;
    venue: string | null;
    host: string | null;
    status: string;
    capacity: number | null;
    registrations: number;
    checkedIn: number;
    walkIns: number;
    noShows: number;
    checkInRate: number | null;
  };
  financialSummary: {
    currency: string;
    ticketRevenue: number;
    bonusCardRevenue: number;
    sponsorRevenue: number;
    otherRevenue: number;
    grossRevenue: number;
    hostCost: number;
    plantCost: number;
    venueCost: number;
    promotionCost: number;
    affiliateCost: number;
    otherExpenses: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number | null;
    breakEvenRevenue: number;
    outstandingPayments: number;
  };
  attendeeSummary: {
    newAttendees: number;
    returningAttendees: number;
    bonusCardBuyers: number;
    powerBuyers: number;
    winners: number;
    checkInRate: number | null;
  };
  gameSummary: {
    scheduled: number;
    completed: number;
    winners: number;
    repeatWinners: number;
    includedCardWins: number;
    bonusCardWins: number;
  };
  plantSummary: {
    purchased: number;
    awarded: number;
    remaining: number;
    totalCost: number;
    mostRequested: Array<{ name: string; count: number }>;
    inventoryGaps: number;
  };
  venuePerformance: {
    eventsAtVenue: number | null;
    avgAttendance: number | null;
    avgRevenue: number | null;
    avgProfit: number | null;
  };
  hostPerformance: {
    totalEvents: number | null;
    avgAttendance: number | null;
    avgRevenue: number | null;
    rating: number | null;
  };
  marketing: {
    bySource: Array<{ source: string; registrations: number; revenue: number; spend: number | null; roi: number | null }>;
    affiliateCount: number;
    promotionCount: number;
    sponsorContributions: number;
  };
  operationalNotes: {
    checklistPercent: number;
    checklistCompleted: number;
    checklistTotal: number;
    incidentCount: number;
    outstandingPayments: number;
    followUpOpen: number;
  };
  scorecard: PostEventScorecard;
  exportLinks: {
    attendees: string;
    plants: string;
    plantRequests: string;
    financials: string;
    financialsSummary: string;
    winners: string;
    venueHistory: string;
    hostHistory: string;
    marketingSources: string;
    activity: string;
    reportPdf: string;
    reportHtml: string;
  };
};
