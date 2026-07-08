import type { EpTrendMetric } from "@/lib/event-platform/dashboard-types";

export type CommissionLedgerRow = {
  id: string;
  date: string;
  bookingId: string;
  eventTitle: string;
  vendorName: string;
  grossAmount: string;
  commissionPercent: string;
  platformCommission: string;
  vendorNet: string;
  currency: string;
  status: string;
};

export type CommissionTrendPoint = {
  month: string;
  grossSales: number;
  platformCommission: number;
};

export type CommissionKpiBlock = {
  grossSales: EpTrendMetric & { amount: number };
  platformCommission: EpTrendMetric & { amount: number };
  paidCommission: EpTrendMetric & { amount: number };
  pendingCommission: EpTrendMetric & { amount: number };
  refundedCommission: EpTrendMetric & { amount: number };
};

export type CommissionVendorPlanRow = {
  id: string;
  vendorName: string;
  planType: "default" | "custom";
  commissionRate: string;
  eventsCount: number;
  earnedToDate: string;
};

export type CommissionRuleRow = {
  id: string;
  eventTitle: string;
  vendorName: string;
  commissionRate: string;
  isActive: boolean;
};

export type CommissionOverviewPayload = {
  ok: true;
  isDemo: boolean;
  globalCommissionRate: number;
  periodLabel: string;
  kpis: CommissionKpiBlock;
  trend: CommissionTrendPoint[];
  recentLedger: CommissionLedgerRow[];
  ledgerTotal: number;
  vendorPlans: CommissionVendorPlanRow[];
  commissionRules: CommissionRuleRow[];
};
