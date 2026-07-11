import type {
  EventExpenseCategory,
  EventFinancialPaymentStatus,
  EventFinancialSource,
  EventRevenueCategory,
} from "@/lib/event-platform/event-financials/event-financials-constants";

export type EventFinancialAmountBucket = {
  actual: number;
  pending: number;
  projected: number;
};

export type EventFinancialSummary = {
  grossRevenue: EventFinancialAmountBucket;
  totalExpenses: EventFinancialAmountBucket;
  netProfit: EventFinancialAmountBucket;
  profitMargin: EventFinancialAmountBucket;
  revenuePerAttendee: number | null;
  costPerAttendee: number | null;
  averageOrderValue: number | null;
  outstandingPayments: number;
  currency: string;
  validAttendeeCount: number;
  orderCount: number;
};

export type EventFinancialLineDto = {
  id: string;
  recordType: "revenue" | "expense";
  category: string;
  categoryLabel: string;
  payeeName: string | null;
  description: string | null;
  quantity: number;
  unitCost: number;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: EventFinancialPaymentStatus | string;
  dueDate: string | null;
  paidDate: string | null;
  receiptUrl: string | null;
  source: EventFinancialSource | string;
  sourceLabel: string;
  notes: string | null;
  editable: boolean;
  bucket: "actual" | "pending" | "projected";
  linkedExpenseId: string | null;
  linkedRevenueId: string | null;
  linkedTransactionId: string | null;
};

export type EventBreakEven = {
  breakEvenRevenue: number;
  currentCollectedRevenue: number;
  amountAboveOrBelow: number;
  ticketsNeeded: number | null;
  bonusCardsNeeded: number | null;
  avgNetTicketRevenue: number | null;
  netBonusCardPrice: number | null;
};

export type EventFinancialForecast = {
  projectedAttendees: number;
  projectedTicketRevenue: number;
  projectedBonusCardRevenue: number;
  projectedExpenses: number;
  projectedNetProfit: number;
  projectedMargin: number | null;
  label: string;
};

export type EventFinancialAnalytics = {
  revenueVsExpenses: Array<{ label: string; revenue: number; expenses: number }>;
  expenseByCategory: Array<{ key: string; label: string; amount: number }>;
  revenueBySource: Array<{ key: string; label: string; amount: number }>;
  profitVsPreviousEvents: Array<{ label: string; netProfit: number }>;
  actualVsProjected: { actualNet: number; projectedNet: number; actualRevenue: number; projectedRevenue: number };
  breakEvenProgress: { collected: number; breakEven: number; percent: number };
};

export type EventFinancialLockState = {
  locked: boolean;
  lockedAt: string | null;
  lockedByName: string | null;
};

export type EventFinancialsOverview = {
  summary: EventFinancialSummary;
  lines: EventFinancialLineDto[];
  breakEven: EventBreakEven;
  forecast: EventFinancialForecast;
  analytics: EventFinancialAnalytics;
  lock: EventFinancialLockState;
  canManageFinancials: boolean;
};

export type CreateEventExpenseInput = {
  category: EventExpenseCategory | string;
  payeeType?: string | null;
  payeeName?: string | null;
  description?: string | null;
  quantity?: number;
  unitCost?: number;
  tax?: number;
  paymentStatus?: EventFinancialPaymentStatus | string;
  dueDate?: string | null;
  paidAt?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
};

export type CreateEventRevenueInput = {
  category: EventRevenueCategory | string;
  payeeName?: string | null;
  description?: string | null;
  amount: number;
  paymentStatus?: EventFinancialPaymentStatus | string;
  receivedAt?: string | null;
  notes?: string | null;
};
