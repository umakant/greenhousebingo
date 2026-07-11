import type { RegistrationSourceType } from "@/lib/event-platform/event-marketing/attribution-constants";

export type EventMarketingFilters = {
  dateFrom?: string;
  dateTo?: string;
  source?: RegistrationSourceType | "all";
  campaign?: string;
  affiliateId?: string;
  promotionCode?: string;
  checkInStatus?: "all" | "checked_in" | "not_checked_in";
  ticketTierId?: string;
};

export type MarketingMetricValue = {
  value: number | null;
  label?: string;
  notAvailable?: boolean;
};

export type EventMarketingSummary = {
  totalRegistrations: number;
  attributedRegistrations: number;
  organicRegistrations: number;
  affiliateRegistrations: number;
  venueRegistrations: number;
  referralRegistrations: number;
  promotionCodeRegistrations: number;
  adSpend: MarketingMetricValue;
  costPerRegistration: MarketingMetricValue;
  attributedRevenue: MarketingMetricValue;
  returnOnAdSpend: MarketingMetricValue;
  conversionRate: MarketingMetricValue;
  currency: string;
  unattributedCount: number;
};

export type EventMarketingSourceRow = {
  sourceType: RegistrationSourceType;
  sourceLabel: string;
  campaign: string | null;
  registrations: number;
  checkedIn: number;
  checkInRate: number | null;
  ticketRevenue: number;
  bonusCardRevenue: number;
  totalRevenue: number;
  spend: number | null;
  costPerRegistration: number | null;
  commission: number;
  netRevenue: number;
  roi: number | null;
  spendKnown: boolean;
};

export type EventMarketingAffiliateRow = {
  partnerId: string;
  affiliateName: string;
  trackingCode: string;
  linkId: string | null;
  clicks: number;
  registrations: number;
  checkedIn: number;
  ticketRevenue: number;
  bonusCardRevenue: number;
  commissionType: string;
  commissionRate: number | null;
  commissionAmount: number;
  payoutStatus: string | null;
  trackingUrl: string | null;
};

export type EventMarketingPromotionRow = {
  promotionId: string | null;
  promotionName: string;
  code: string;
  discountType: string | null;
  discountValue: number | null;
  usageCount: number;
  totalDiscount: number | null;
  revenueGenerated: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

export type EventMarketingSponsorPanel = {
  sponsorId: string | null;
  sponsorName: string | null;
  package: string | null;
  contribution: number | null;
  paymentStatus: string | null;
  deliverables: string[];
  completedDeliverables: string[];
  contact: string | null;
  notes: string | null;
  agreementUrl: string | null;
  profileUrl: string | null;
};

export type EventMarketingChartPoint = {
  key: string;
  label: string;
  registrations: number;
  revenue: number;
  spend: number | null;
  conversionRate: number | null;
};

export type EventMarketingOverview = {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  canManage: boolean;
  attributionRuleDescription: string;
  filters: EventMarketingFilters;
  summary: EventMarketingSummary;
  sources: EventMarketingSourceRow[];
  affiliates: EventMarketingAffiliateRow[];
  promotions: EventMarketingPromotionRow[];
  sponsor: EventMarketingSponsorPanel | null;
  charts: {
    registrationsBySource: EventMarketingChartPoint[];
    revenueBySource: EventMarketingChartPoint[];
    registrationTrendByCampaign: EventMarketingChartPoint[];
    adSpendVsRevenue: EventMarketingChartPoint[];
    affiliateConversion: EventMarketingChartPoint[];
  };
  dataQuality: {
    registrationsWithAttributionFields: number;
    registrationsMissingAttribution: number;
    message: string;
  };
};
