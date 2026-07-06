/**
 * Storefront merchant onboarding checklist (Storefronts add-on).
 * Derived steps read from Prisma; manual steps persist on `Website.metadata.setup` until dedicated tables exist.
 */

export const STOREFRONT_SETUP_STEP_IDS = [
  "website_created",
  "domain_attached",
  "theme_selected",
  "homepage_published",
  "first_product_created",
  "payment_configured",
  "shipping_configured",
  "taxes_configured",
  "customer_accounts_enabled",
] as const;

export type StorefrontSetupStepId = (typeof STOREFRONT_SETUP_STEP_IDS)[number];

/** Keys stored under Website.metadata.setup (camelCase JSON). */
export type StorefrontWebsiteSetupFlags = {
  firstProductCreated?: boolean;
  paymentConfigured?: boolean;
  shippingConfigured?: boolean;
  taxesConfigured?: boolean;
  customerAccountsEnabled?: boolean;
};

export type StorefrontSetupStepSnapshot = {
  id: StorefrontSetupStepId;
  label: string;
  description: string;
  /** Staff UI deep-link for this area */
  href: string;
  completed: boolean;
  source: "derived" | "manual";
};

export const STOREFRONT_SETUP_STEP_DEF: Record<
  StorefrontSetupStepId,
  Omit<StorefrontSetupStepSnapshot, "completed" | "source">
> = {
  website_created: {
    id: "website_created",
    label: "Website created",
    description: "At least one storefront website exists for your organization.",
    href: "/storefront/websites",
  },
  domain_attached: {
    id: "domain_attached",
    label: "Domain attached",
    description: "A custom domain is connected to your primary website.",
    href: "/storefront/websites",
  },
  theme_selected: {
    id: "theme_selected",
    label: "Theme selected",
    description: "A theme is assigned to the website and published or active.",
    href: "/storefront/themes",
  },
  homepage_published: {
    id: "homepage_published",
    label: "Homepage published",
    description: "The home page (slug index or home) has a published version.",
    href: "/storefront/pages",
  },
  first_product_created: {
    id: "first_product_created",
    label: "First product created",
    description: "You have added at least one product to the catalog (confirm when catalog APIs are wired).",
    href: "/storefront/products",
  },
  payment_configured: {
    id: "payment_configured",
    label: "Payment configured",
    description: "Checkout payment methods are ready for customers.",
    href: "/storefront/checkout",
  },
  shipping_configured: {
    id: "shipping_configured",
    label: "Shipping configured",
    description: "Shipping zones or rates are configured.",
    href: "/storefront/shipping",
  },
  taxes_configured: {
    id: "taxes_configured",
    label: "Taxes configured",
    description: "Tax rules or rates are configured for your store.",
    href: "/storefront/taxes",
  },
  customer_accounts_enabled: {
    id: "customer_accounts_enabled",
    label: "Customer accounts enabled",
    description: "Shoppers can register and sign in on your storefront (per-website customer auth).",
    href: "/storefront/settings",
  },
};

const MANUAL_IDS = new Set<StorefrontSetupStepId>([
  "first_product_created",
  "payment_configured",
  "shipping_configured",
  "taxes_configured",
  "customer_accounts_enabled",
]);

export function isManualStorefrontSetupStep(id: StorefrontSetupStepId): boolean {
  return MANUAL_IDS.has(id);
}

export function pickNextStorefrontSetupStep(steps: StorefrontSetupStepSnapshot[]): StorefrontSetupStepSnapshot | null {
  return steps.find((s) => !s.completed) ?? null;
}
