import {
  STOREFRONT_MERCHANT_SETTING_KEYS,
  STOREFRONT_MERCHANT_SETTINGS_DEFAULTS,
} from "@/lib/storefront/storefront-settings-keys";
import { resolveStorefrontCatalogCurrencyCode } from "@/lib/storefront/storefront-price-format";

/**
 * Day 8 — Safe subset for storefront runtime / public renderer (no internal-only keys).
 * Merge with `getSettingsForOwner` on the company tenant.
 */
export type PublicStorefrontBrandSettings = {
  storeName: string;
  /** Short line shown with the site title in the storefront header when enabled (Concept themes). */
  siteTagline: string;
  /** When false, hide injected title/tagline text beside the logo (logo + favicon still apply). */
  displaySiteTitleTagline: boolean;
  supportEmail: string;
  logoUrl: string;
  faviconUrl: string;
  defaultLocale: string;
  currencyDisplay: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
  customerAccountsEnabled: boolean;
  maintenanceMode: boolean;
  checkoutBrandPrimary: string;
  checkoutBrandAccent: string;
  /** ISO 4217 for POS/catalog prices (from company `defaultCurrency`, else USD). */
  catalogCurrencyCode: string;
  /**
   * Stripe.js publishable key for checkout (from Storefront Payments when Stripe is enabled, else
   * `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` when set). Safe to expose to the browser.
   */
  stripePublishableKey: string;
};

export function buildPublicStorefrontSettings(raw: Record<string, string>): PublicStorefrontBrandSettings {
  const g = (k: keyof typeof STOREFRONT_MERCHANT_SETTINGS_DEFAULTS) =>
    raw[k] ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS[k];

  const stripeOn = g("sf_stripe_enabled") === "1";
  const stripeMode = (g("sf_stripe_mode") ?? "").trim().toLowerCase() === "live" ? "live" : "sandbox";
  let stripePublishableKey = "";
  if (stripeOn) {
    stripePublishableKey =
      stripeMode === "live"
        ? g("sf_stripe_publishable_key_live").trim()
        : g("sf_stripe_publishable_key_sandbox").trim();
  }
  if (!stripePublishableKey && typeof process !== "undefined") {
    const envPk = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
    if (envPk) stripePublishableKey = envPk;
  }

  return {
    storeName: g("sf_store_name"),
    siteTagline: g("sf_site_tagline"),
    displaySiteTitleTagline: g("sf_display_site_title_tagline") !== "0",
    supportEmail: g("sf_support_email"),
    logoUrl: g("sf_logo_url"),
    faviconUrl: g("sf_favicon_url"),
    defaultLocale: g("sf_default_locale"),
    currencyDisplay: g("sf_currency_display"),
    seoDefaultTitle: g("sf_seo_default_title"),
    seoDefaultDescription: g("sf_seo_default_description"),
    customerAccountsEnabled: g("sf_customer_accounts_enabled") === "1",
    maintenanceMode: g("sf_maintenance_mode") === "1",
    checkoutBrandPrimary: g("sf_checkout_brand_primary"),
    checkoutBrandAccent: g("sf_checkout_brand_accent"),
    catalogCurrencyCode: resolveStorefrontCatalogCurrencyCode(raw),
    stripePublishableKey,
  };
}

export function listStorefrontMerchantSettingKeys(): readonly string[] {
  return STOREFRONT_MERCHANT_SETTING_KEYS;
}
