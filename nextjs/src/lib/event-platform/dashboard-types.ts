/** Client-safe dashboard DTOs (no server-only imports). */

export type EpTrendMetric = {
  value: number;
  change: number;
  changeLabel: string;
  direction: "up" | "down" | "flat";
};

export type EpRevenuePoint = {
  month: string;
  revenue: number;
  commission: number;
};

export type EpBookingStatusSlice = {
  status: string;
  label: string;
  count: number;
  percent: number;
};

export type EpTopEvent = {
  id: string;
  title: string;
  imageUrl: string | null;
  revenue: string;
  rank: number;
};

export type EpRecentBooking = {
  id: string;
  attendeeName: string;
  eventTitle: string;
  amount: string;
  status: string;
  createdAt: string;
};

export type EpVendorPayoutRow = {
  vendorId: string;
  vendorName: string;
  pendingAmount: string;
  lastPayoutAt: string | null;
};

export type EpUpcomingEvent = {
  id: string;
  title: string;
  imageUrl: string | null;
  startsAt: string;
  venueName: string | null;
  eventType: string;
  categoryName: string | null;
};

export type EpActivityItem = {
  id: string;
  action: string;
  label: string;
  createdAt: string;
};

export type EventPlatformDashboardSummary = {
  totalVendors: number;
  activeVendors: number;
  totalEvents: number;
  totalBookings: number;
  grossRevenue: string;
  platformCommissionPending: string;
  totalPlatformCommission: string;
  vendorNetPending: string;
  pendingPayouts: number;
  pendingPayoutAmount: string;
  pendingPayoutVendorCount: number;
  activePopups: number;
  publishedPages: number;
  globalCommissionRate: number;
  revenueByMonth: EpRevenuePoint[];
  trends: {
    events: EpTrendMetric;
    bookings: EpTrendMetric;
    revenue: EpTrendMetric;
    commission: EpTrendMetric;
    activeVendors: EpTrendMetric;
    pendingPayouts: EpTrendMetric;
  };
  bookingsByStatus: EpBookingStatusSlice[];
  topPerformingEvents: EpTopEvent[];
  recentBookings: EpRecentBooking[];
  vendorPayoutSummary: EpVendorPayoutRow[];
  upcomingEvents: EpUpcomingEvent[];
  platformActivity: EpActivityItem[];
  recentVendors: Array<{ id: string; vendorName: string; status: string; createdAt: string }>;
  recentPayouts: Array<{ id: string; vendorName: string; totalAmount: string; status: string; createdAt: string }>;
};
