export const EVENT_VENDOR_STATUSES = ["pending", "active", "suspended", "rejected", "archived"] as const;

export type EventVendorStatus = (typeof EVENT_VENDOR_STATUSES)[number];

export type EventVendorDto = {
  id: string;
  organizationId: string;
  vendorName: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  businessType: string | null;
  status: string;
  defaultCommissionRate: string | null;
  overrideCommissionRate: string | null;
  payoutMethod: string | null;
  taxId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  linkedUserId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type EventVendorListRow = EventVendorDto & {
  commissionRate: string;
  commissionPlan: "default" | "custom";
  totalSales: string;
  commissionEarned: string;
  pendingPayout: string;
  pendingPayoutStatus: "pending" | "hold" | "none";
};

export type EventVendorsSummary = {
  totalVendors: number;
  activeVendors: number;
  pendingVendors: number;
  newVendorsThisMonth: number;
  activePercent: number;
  totalCommissionEarned: string;
  commissionTrendPercent: number;
  pendingPayoutAmount: string;
  pendingPayoutVendorCount: number;
};

export type EventVendorsListPayload = {
  summary: EventVendorsSummary;
  items: EventVendorListRow[];
};
