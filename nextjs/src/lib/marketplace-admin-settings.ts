/** Marketplace operational settings (not global Super Admin settings). */

export const MARKETPLACE_SETTINGS_CONFIG_KEY = "admin_operational_settings";

export const VENDOR_PERMISSION_MATRIX_KEYS = [
  "view_dashboard",
  "manage_products",
  "manage_inventory",
  "manage_orders",
  "manage_deliveries",
  "manage_customers",
  "view_reports",
  "manage_staff",
] as const;

export const VENDOR_PERMISSION_MATRIX_LABELS: Record<(typeof VENDOR_PERMISSION_MATRIX_KEYS)[number], string> = {
  view_dashboard: "View Dashboard",
  manage_products: "Manage Products",
  manage_inventory: "Manage Inventory",
  manage_orders: "Manage Orders",
  manage_deliveries: "Manage Deliveries",
  manage_customers: "Manage Customers",
  view_reports: "View Reports",
  manage_staff: "Manage Staff",
};

export const ORDER_WORKFLOW_KEYS = [
  "pending",
  "accepted",
  "packed",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const ORDER_WORKFLOW_LABELS: Record<(typeof ORDER_WORKFLOW_KEYS)[number], string> = {
  pending: "Pending",
  accepted: "Accepted",
  packed: "Packed",
  ready: "Ready",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type MarketplaceAdminSettings = {
  configuration: {
    marketplaceStatus: "active" | "disabled";
    marketplaceMode: "single_vendor" | "multi_vendor";
    requireVendorApproval: boolean;
    allowVendorSelfRegistration: boolean;
    defaultVendorStatus: "pending" | "approved" | "suspended";
    allowVendorProductImports: boolean;
    enableVendorStorePages: boolean;
  };
  vendorManagement: {
    defaultVendorCommissionOverride: boolean;
    allowVendorsToManageStaff: boolean;
    allowVendorsToCreateCoupons: boolean;
    allowVendorsToIssueRefunds: boolean;
    vendorProductApprovalRequired: boolean;
    vendorProductEditApprovalRequired: boolean;
    permissionsMatrix: Record<string, boolean>;
  };
  commissions: {
    defaultCommissionType: "percentage" | "fixed";
    defaultCommissionValue: string;
    enableTieredCommission: boolean;
    tier1MaxOrders: string;
    tier2MaxOrders: string;
    tier1Rate: string;
    tier2Rate: string;
    tier3Rate: string;
    minimumVendorPayout: string;
    payoutFrequency: "daily" | "weekly" | "biweekly" | "monthly";
  };
  orders: {
    orderPrefix: string;
    autoAcceptOrders: boolean;
    vendorMustAcceptOrders: boolean;
    orderCancellationWindowHours: string;
    allowCustomerCancellations: boolean;
    allowVendorCancellations: boolean;
    refundApprovalRequired: boolean;
    orderStatusWorkflow: Record<string, boolean>;
  };
  delivery: {
    enableDeliveryQueue: boolean;
    enableDeliveryEvents: boolean;
    enableDeliveryMap: boolean;
    enableRouteOptimization: boolean;
    deliveryAssignmentMode: "manual" | "auto";
    maximumDeliveryRadiusMiles: string;
    driverAssignmentRequired: boolean;
    driverNotificationEnabled: boolean;
  };
  customerExperience: {
    enableProductReviews: boolean;
    enableVendorReviews: boolean;
    enableWishlist: boolean;
    enableCoupons: boolean;
    enablePromotions: boolean;
    enableRelatedProducts: boolean;
    enableRecommendedProducts: boolean;
    enableCustomerMessaging: boolean;
  };
  payments: {
    commissionCollectionMethod: "at_checkout" | "at_payout";
    vendorPayoutHoldPeriodDays: string;
    automaticVendorPayouts: boolean;
    splitPaymentsEnabled: boolean;
    vendorWalletSystem: boolean;
  };
  notifications: {
    vendorNewOrder: boolean;
    customerOrderConfirmation: boolean;
    deliveryNotifications: boolean;
    vendorPayoutNotifications: boolean;
    refundNotifications: boolean;
    channels: { email: boolean; sms: boolean; push: boolean };
  };
  policies: {
    vendorAgreement: string;
    marketplaceTerms: string;
    vendorRefundRules: string;
    vendorCancellationRules: string;
  };
  advanced: {
    marketplaceApiAccess: boolean;
    vendorApiAccess: boolean;
    webhookUrl: string;
    marketplaceAnalytics: boolean;
    auditLogging: boolean;
    vendorActivityTracking: boolean;
  };
};

function matrixDefaults(keys: readonly string[], allEnabled = true): Record<string, boolean> {
  return Object.fromEntries(keys.map((k) => [k, allEnabled]));
}

export const DEFAULT_MARKETPLACE_ADMIN_SETTINGS: MarketplaceAdminSettings = {
  configuration: {
    marketplaceStatus: "active",
    marketplaceMode: "multi_vendor",
    requireVendorApproval: true,
    allowVendorSelfRegistration: false,
    defaultVendorStatus: "pending",
    allowVendorProductImports: false,
    enableVendorStorePages: true,
  },
  vendorManagement: {
    defaultVendorCommissionOverride: false,
    allowVendorsToManageStaff: true,
    allowVendorsToCreateCoupons: false,
    allowVendorsToIssueRefunds: false,
    vendorProductApprovalRequired: true,
    vendorProductEditApprovalRequired: false,
    permissionsMatrix: matrixDefaults(VENDOR_PERMISSION_MATRIX_KEYS),
  },
  commissions: {
    defaultCommissionType: "percentage",
    defaultCommissionValue: "10",
    enableTieredCommission: false,
    tier1MaxOrders: "100",
    tier2MaxOrders: "500",
    tier1Rate: "10",
    tier2Rate: "8",
    tier3Rate: "6",
    minimumVendorPayout: "50",
    payoutFrequency: "monthly",
  },
  orders: {
    orderPrefix: "MP-",
    autoAcceptOrders: false,
    vendorMustAcceptOrders: true,
    orderCancellationWindowHours: "24",
    allowCustomerCancellations: true,
    allowVendorCancellations: true,
    refundApprovalRequired: true,
    orderStatusWorkflow: matrixDefaults(ORDER_WORKFLOW_KEYS),
  },
  delivery: {
    enableDeliveryQueue: true,
    enableDeliveryEvents: true,
    enableDeliveryMap: true,
    enableRouteOptimization: false,
    deliveryAssignmentMode: "manual",
    maximumDeliveryRadiusMiles: "25",
    driverAssignmentRequired: true,
    driverNotificationEnabled: true,
  },
  customerExperience: {
    enableProductReviews: true,
    enableVendorReviews: true,
    enableWishlist: true,
    enableCoupons: true,
    enablePromotions: true,
    enableRelatedProducts: true,
    enableRecommendedProducts: true,
    enableCustomerMessaging: false,
  },
  payments: {
    commissionCollectionMethod: "at_checkout",
    vendorPayoutHoldPeriodDays: "7",
    automaticVendorPayouts: false,
    splitPaymentsEnabled: false,
    vendorWalletSystem: false,
  },
  notifications: {
    vendorNewOrder: true,
    customerOrderConfirmation: true,
    deliveryNotifications: true,
    vendorPayoutNotifications: true,
    refundNotifications: true,
    channels: { email: true, sms: false, push: false },
  },
  policies: {
    vendorAgreement: "",
    marketplaceTerms: "",
    vendorRefundRules: "",
    vendorCancellationRules: "",
  },
  advanced: {
    marketplaceApiAccess: false,
    vendorApiAccess: false,
    webhookUrl: "",
    marketplaceAnalytics: true,
    auditLogging: true,
    vendorActivityTracking: true,
  },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function mergeSection<T extends Record<string, unknown>>(defaults: T, raw: unknown): T {
  if (!isObject(raw)) return { ...defaults };
  const out: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const def = defaults[key];
    const val = raw[key];
    if (typeof def === "boolean") out[key] = val === true;
    else if (typeof def === "string") out[key] = val != null ? String(val) : def;
    else if (isObject(def) && isObject(val)) out[key] = mergeSection(def, val);
    else if (isObject(def) && !isObject(val)) out[key] = { ...def };
    else if (val !== undefined) out[key] = val;
  }
  return out as T;
}

export function parseMarketplaceAdminSettings(raw: unknown): MarketplaceAdminSettings {
  const base = DEFAULT_MARKETPLACE_ADMIN_SETTINGS;
  if (!isObject(raw)) return structuredClone(base);

  return {
    configuration: mergeSection(base.configuration, raw.configuration),
    vendorManagement: mergeSection(base.vendorManagement, raw.vendorManagement),
    commissions: mergeSection(base.commissions, raw.commissions),
    orders: mergeSection(base.orders, raw.orders),
    delivery: mergeSection(base.delivery, raw.delivery),
    customerExperience: mergeSection(base.customerExperience, raw.customerExperience),
    payments: mergeSection(base.payments, raw.payments),
    notifications: mergeSection(base.notifications, raw.notifications),
    policies: mergeSection(base.policies, raw.policies),
    advanced: mergeSection(base.advanced, raw.advanced),
  };
}

export function validateMarketplaceAdminSettings(s: MarketplaceAdminSettings): string | null {
  const rate = Number(s.commissions.defaultCommissionValue);
  if (!Number.isFinite(rate) || rate < 0) return "Default commission value must be a non-negative number.";
  if (s.commissions.defaultCommissionType === "percentage" && rate > 100) {
    return "Percentage commission cannot exceed 100.";
  }
  const payout = Number(s.commissions.minimumVendorPayout);
  if (!Number.isFinite(payout) || payout < 0) return "Minimum vendor payout must be a non-negative number.";
  const hold = Number(s.payments.vendorPayoutHoldPeriodDays);
  if (!Number.isFinite(hold) || hold < 0) return "Payout hold period must be a non-negative number.";
  const radius = Number(s.delivery.maximumDeliveryRadiusMiles);
  if (!Number.isFinite(radius) || radius < 0) return "Maximum delivery radius must be a non-negative number.";
  const cancelWindow = Number(s.orders.orderCancellationWindowHours);
  if (!Number.isFinite(cancelWindow) || cancelWindow < 0) return "Cancellation window must be a non-negative number.";
  if (s.advanced.webhookUrl.trim()) {
    try {
      const u = new URL(s.advanced.webhookUrl.trim());
      if (!["http:", "https:"].includes(u.protocol)) return "Webhook URL must use HTTP or HTTPS.";
    } catch {
      return "Webhook URL is not valid.";
    }
  }
  return null;
}
