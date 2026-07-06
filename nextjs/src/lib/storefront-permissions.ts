import { STOREFRONT_MERCHANT_SECTIONS } from "@/components/storefront/storefront-sections";
import { hasPermission } from "@/lib/authz";

/** Granular Storefront add-on permissions (DB `permissions.name`). */
export const STOREFRONT_PERMISSION = {
  VIEW: "storefront.view",
  SETTINGS_MANAGE: "storefront.settings.manage",
  WEBSITE_MANAGE: "storefront.website.manage",
  THEME_MANAGE: "storefront.theme.manage",
  PAGE_MANAGE: "storefront.page.manage",
  PUBLISH: "storefront.publish",
  CATALOG_MANAGE: "storefront.catalog.manage",
  CHECKOUT_MANAGE: "storefront.checkout.manage",
  ORDER_MANAGE: "storefront.order.manage",
  DISCOUNT_MANAGE: "storefront.discount.manage",
  SHIPPING_MANAGE: "storefront.shipping.manage",
  TAX_MANAGE: "storefront.tax.manage",
  CUSTOMER_MANAGE: "storefront.customer.manage",
  ANALYTICS_VIEW: "storefront.analytics.view",
  /** Legacy full access (grants every Storefront action). */
  LEGACY_MANAGE: "manage-storefront",
  LEGACY_SETTINGS: "manage-storefront-settings",
} as const;

export type StorefrontPermissionName = (typeof STOREFRONT_PERMISSION)[keyof typeof STOREFRONT_PERMISSION];

/** All granular keys (excludes legacy aliases). */
export const STOREFRONT_GRANULAR_PERMISSIONS: readonly string[] = [
  STOREFRONT_PERMISSION.VIEW,
  STOREFRONT_PERMISSION.SETTINGS_MANAGE,
  STOREFRONT_PERMISSION.WEBSITE_MANAGE,
  STOREFRONT_PERMISSION.THEME_MANAGE,
  STOREFRONT_PERMISSION.PAGE_MANAGE,
  STOREFRONT_PERMISSION.PUBLISH,
  STOREFRONT_PERMISSION.CATALOG_MANAGE,
  STOREFRONT_PERMISSION.CHECKOUT_MANAGE,
  STOREFRONT_PERMISSION.ORDER_MANAGE,
  STOREFRONT_PERMISSION.DISCOUNT_MANAGE,
  STOREFRONT_PERMISSION.SHIPPING_MANAGE,
  STOREFRONT_PERMISSION.TAX_MANAGE,
  STOREFRONT_PERMISSION.CUSTOMER_MANAGE,
  STOREFRONT_PERMISSION.ANALYTICS_VIEW,
];

/** Permissions that imply some write capability (not view-only). */
export const STOREFRONT_WRITE_CAPABLE_PERMISSIONS: readonly string[] = [
  STOREFRONT_PERMISSION.SETTINGS_MANAGE,
  STOREFRONT_PERMISSION.WEBSITE_MANAGE,
  STOREFRONT_PERMISSION.THEME_MANAGE,
  STOREFRONT_PERMISSION.PAGE_MANAGE,
  STOREFRONT_PERMISSION.PUBLISH,
  STOREFRONT_PERMISSION.CATALOG_MANAGE,
  STOREFRONT_PERMISSION.CHECKOUT_MANAGE,
  STOREFRONT_PERMISSION.ORDER_MANAGE,
  STOREFRONT_PERMISSION.DISCOUNT_MANAGE,
  STOREFRONT_PERMISSION.SHIPPING_MANAGE,
  STOREFRONT_PERMISSION.TAX_MANAGE,
  STOREFRONT_PERMISSION.CUSTOMER_MANAGE,
  STOREFRONT_PERMISSION.LEGACY_SETTINGS,
];

export function userHasFullStorefrontAccess(permissions: string[]): boolean {
  if (permissions.includes("*")) return true;
  return hasPermission(permissions, STOREFRONT_PERMISSION.LEGACY_MANAGE);
}

export function userCanViewStorefront(permissions: string[]): boolean {
  if (userHasFullStorefrontAccess(permissions)) return true;
  return hasPermission(permissions, STOREFRONT_PERMISSION.VIEW);
}

/** True if the user has the named permission or legacy full Storefront access. */
export function userHasStorefrontPermission(permissions: string[], required: string): boolean {
  if (userHasFullStorefrontAccess(permissions)) return true;
  return hasPermission(permissions, required);
}

export function userHasAnyStorefrontPermission(permissions: string[], required: string[]): boolean {
  if (userHasFullStorefrontAccess(permissions)) return true;
  return required.some((r) => hasPermission(permissions, r));
}

/** Can perform any mutating Storefront action (any manage permission or legacy). */
export function userCanMutateStorefront(permissions: string[]): boolean {
  if (userHasFullStorefrontAccess(permissions)) return true;
  return STOREFRONT_WRITE_CAPABLE_PERMISSIONS.some((p) => hasPermission(permissions, p));
}

/** Route / menu access for a merchant section (pages also allow `storefront.publish`). */
export function userMayAccessStorefrontSection(permissions: string[], sectionId: string): boolean {
  if (userHasFullStorefrontAccess(permissions)) return true;
  const row = STOREFRONT_MERCHANT_SECTIONS.find((s) => s.id === sectionId);
  if (!row) return userCanViewStorefront(permissions);
  if (
    sectionId === "pages" ||
    sectionId === "blog" ||
    sectionId === "events" ||
    sectionId === "events-schedule"
  ) {
    return userHasAnyStorefrontPermission(permissions, [
      STOREFRONT_PERMISSION.PAGE_MANAGE,
      STOREFRONT_PERMISSION.PUBLISH,
    ]);
  }
  return hasPermission(permissions, row.permission);
}
