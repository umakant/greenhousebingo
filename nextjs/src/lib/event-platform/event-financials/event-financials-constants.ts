export const EVENT_EXPENSE_CATEGORIES = [
  "host",
  "plants",
  "venue",
  "promotions",
  "affiliates",
  "staff",
  "supplies",
  "processing_fees",
  "equipment",
  "transportation",
  "printing",
  "refunds",
  "taxes",
  "insurance",
  "other",
] as const;

export type EventExpenseCategory = (typeof EVENT_EXPENSE_CATEGORIES)[number];

export const EVENT_EXPENSE_CATEGORY_LABELS: Record<EventExpenseCategory, string> = {
  host: "Host",
  plants: "Plants",
  venue: "Venue",
  promotions: "Promotions",
  affiliates: "Affiliates",
  staff: "Staff",
  supplies: "Supplies",
  processing_fees: "Processing Fees",
  equipment: "Equipment",
  transportation: "Transportation",
  printing: "Printing",
  refunds: "Refunds",
  taxes: "Taxes",
  insurance: "Insurance",
  other: "Other",
};

export const EVENT_REVENUE_CATEGORIES = [
  "ticket_sales",
  "bonus_card_sales",
  "vip_upgrades",
  "walk_in_sales",
  "sponsor_revenue",
  "merchandise",
  "venue_contribution",
  "other_revenue",
] as const;

export type EventRevenueCategory = (typeof EVENT_REVENUE_CATEGORIES)[number];

export const EVENT_REVENUE_CATEGORY_LABELS: Record<EventRevenueCategory, string> = {
  ticket_sales: "Ticket Sales",
  bonus_card_sales: "Bonus-Card Sales",
  vip_upgrades: "VIP Upgrades",
  walk_in_sales: "Walk-In Sales",
  sponsor_revenue: "Sponsor Revenue",
  merchandise: "Merchandise",
  venue_contribution: "Venue Contribution",
  other_revenue: "Other Revenue",
};

export const EVENT_FINANCIAL_PAYMENT_STATUSES = [
  "draft",
  "pending",
  "approved",
  "partially_paid",
  "paid",
  "overdue",
  "refunded",
  "cancelled",
] as const;

export type EventFinancialPaymentStatus = (typeof EVENT_FINANCIAL_PAYMENT_STATUSES)[number];

export const EVENT_FINANCIAL_SOURCES = [
  "ticket_transaction",
  "bonus_card_sale",
  "sponsor",
  "commission",
  "payout",
  "manual_expense",
  "manual_revenue",
  "accounting_expense",
  "plant_inventory",
  "refund",
  "other",
] as const;

export type EventFinancialSource = (typeof EVENT_FINANCIAL_SOURCES)[number];

export const EXPENSE_ACTUAL_STATUSES = new Set(["approved", "paid", "partially_paid"]);
export const REVENUE_ACTUAL_STATUSES = new Set(["completed", "paid"]);
export const REVENUE_PENDING_STATUSES = new Set(["pending"]);
