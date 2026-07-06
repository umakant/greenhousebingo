/** Client-safe vendor portal permission constants (mirrors server presets). */

export const VENDOR_STAFF_ROLES = ["vendor_admin", "vendor_manager", "vendor_staff"] as const;
export type VendorStaffRole = (typeof VENDOR_STAFF_ROLES)[number];

export const MARKETPLACE_VENDOR_PERMISSION_KEYS = [
  "marketplace.vendor_portal.dashboard.view",
  "marketplace.vendor_portal.products.view",
  "marketplace.vendor_portal.products.create",
  "marketplace.vendor_portal.products.edit",
  "marketplace.vendor_portal.products.delete",
  "marketplace.vendor_portal.orders.view",
  "marketplace.vendor_portal.orders.update_status",
  "marketplace.vendor_portal.delivery_queue.view",
  "marketplace.vendor_portal.delivery.assign",
  "marketplace.vendor_portal.reports.view",
  "marketplace.vendor_portal.customers.view",
  "marketplace.vendor_portal.profile.manage",
  "marketplace.vendor_portal.staff.manage",
] as const;

export type MarketplaceVendorPermissionKey = (typeof MARKETPLACE_VENDOR_PERMISSION_KEYS)[number];

export const VENDOR_PERMISSION_LABELS: Record<MarketplaceVendorPermissionKey, string> = {
  "marketplace.vendor_portal.dashboard.view": "View dashboard",
  "marketplace.vendor_portal.products.view": "View products",
  "marketplace.vendor_portal.products.create": "Add products",
  "marketplace.vendor_portal.products.edit": "Edit products",
  "marketplace.vendor_portal.products.delete": "Delete products",
  "marketplace.vendor_portal.orders.view": "View orders",
  "marketplace.vendor_portal.orders.update_status": "Update order status",
  "marketplace.vendor_portal.delivery_queue.view": "View delivery queue",
  "marketplace.vendor_portal.delivery.assign": "Assign delivery",
  "marketplace.vendor_portal.reports.view": "View reports",
  "marketplace.vendor_portal.customers.view": "View customers",
  "marketplace.vendor_portal.profile.manage": "Manage vendor profile",
  "marketplace.vendor_portal.staff.manage": "Manage vendor staff",
};

export const VENDOR_ROLE_LABELS: Record<VendorStaffRole, string> = {
  vendor_admin: "Vendor Admin",
  vendor_manager: "Vendor Manager",
  vendor_staff: "Vendor Staff",
};

export const VENDOR_ROLE_PRESETS: Record<VendorStaffRole, MarketplaceVendorPermissionKey[]> = {
  vendor_admin: [...MARKETPLACE_VENDOR_PERMISSION_KEYS],
  vendor_manager: [
    "marketplace.vendor_portal.dashboard.view",
    "marketplace.vendor_portal.products.view",
    "marketplace.vendor_portal.products.create",
    "marketplace.vendor_portal.products.edit",
    "marketplace.vendor_portal.products.delete",
    "marketplace.vendor_portal.orders.view",
    "marketplace.vendor_portal.orders.update_status",
    "marketplace.vendor_portal.delivery_queue.view",
    "marketplace.vendor_portal.delivery.assign",
    "marketplace.vendor_portal.reports.view",
    "marketplace.vendor_portal.customers.view",
    "marketplace.vendor_portal.profile.manage",
  ],
  vendor_staff: [
    "marketplace.vendor_portal.dashboard.view",
    "marketplace.vendor_portal.orders.view",
    "marketplace.vendor_portal.orders.update_status",
    "marketplace.vendor_portal.delivery_queue.view",
    "marketplace.vendor_portal.profile.manage",
  ],
};

export function presetPermissionsForRole(role: VendorStaffRole): Record<string, boolean> {
  const set = new Set(VENDOR_ROLE_PRESETS[role]);
  return Object.fromEntries(MARKETPLACE_VENDOR_PERMISSION_KEYS.map((k) => [k, set.has(k)]));
}

export function generateClientPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) out += chars[arr[i]! % chars.length];
  return out;
}

export type VendorLoginAccessForm = {
  enabled: boolean;
  loginEmail: string;
  temporaryPassword: string;
  sendInviteEmail: boolean;
  vendorRole: VendorStaffRole;
  permissions: Record<string, boolean>;
};

export const EMPTY_LOGIN_ACCESS: VendorLoginAccessForm = {
  enabled: false,
  loginEmail: "",
  temporaryPassword: "",
  sendInviteEmail: true,
  vendorRole: "vendor_admin",
  permissions: presetPermissionsForRole("vendor_admin"),
};
