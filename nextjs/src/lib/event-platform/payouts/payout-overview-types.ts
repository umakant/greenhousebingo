import type { EpTrendMetric } from "@/lib/event-platform/dashboard-types";

export type PayoutKpiBlock = {
  totalPayouts: EpTrendMetric & { amount: number };
  pendingPayouts: EpTrendMetric & { amount: number; batchCount: number };
  paidThisMonth: EpTrendMetric & { amount: number; payoutCount: number };
  vendorsPaid: EpTrendMetric & { count: number };
  nextPayout: { date: string; label: string; daysRemaining: number };
};

export type PayoutBatchRow = {
  id: string;
  batchId: string;
  dateCreated: string;
  periodLabel: string;
  vendorCount: number;
  amount: string;
  currency: string;
  status: string;
  payoutMethod: string;
};

export type PayoutStatusSlice = {
  status: string;
  label: string;
  amount: number;
  percent: number;
};

export type TopVendorPayout = {
  rank: number;
  vendorName: string;
  amount: string;
};

export type UpcomingPayout = {
  id: string;
  date: string;
  vendorCount: number;
  amount: string;
  status: string;
};

export type PayoutOverviewPayload = {
  ok: true;
  isDemo: boolean;
  periodLabel: string;
  kpis: PayoutKpiBlock;
  batches: PayoutBatchRow[];
  batchTotal: number;
  statusOverview: PayoutStatusSlice[];
  statusTotal: number;
  topVendors: TopVendorPayout[];
  upcomingPayouts: UpcomingPayout[];
};
