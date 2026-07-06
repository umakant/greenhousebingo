/** Day 8 — persisted under `settings` table for settings owner (company), keys prefixed for clarity. */
export const STOREFRONT_MERCHANT_SETTING_KEYS = [
  "sf_store_name",
  "sf_site_tagline",
  "sf_display_site_title_tagline",
  "sf_support_email",
  "sf_logo_url",
  "sf_favicon_url",
  "sf_default_locale",
  "sf_currency_display",
  "sf_seo_default_title",
  "sf_seo_default_description",
  "sf_customer_accounts_enabled",
  "sf_maintenance_mode",
  "sf_checkout_brand_primary",
  "sf_checkout_brand_accent",
  /** Payment gateways — mode picks which credential set is active at checkout. */
  "sf_stripe_enabled",
  "sf_stripe_mode",
  "sf_stripe_publishable_key_sandbox",
  "sf_stripe_secret_key_sandbox",
  "sf_stripe_publishable_key_live",
  "sf_stripe_secret_key_live",
  "sf_paypal_enabled",
  "sf_paypal_mode",
  "sf_paypal_client_id_sandbox",
  "sf_paypal_client_secret_sandbox",
  "sf_paypal_client_id_live",
  "sf_paypal_client_secret_live",
] as const;

export type StorefrontMerchantSettingKey = (typeof STOREFRONT_MERCHANT_SETTING_KEYS)[number];

/** Editable from the theme customizer “Site identity” panel (same backing store as Storefront settings). */
export const STOREFRONT_SITE_IDENTITY_KEYS = [
  "sf_store_name",
  "sf_site_tagline",
  "sf_display_site_title_tagline",
  "sf_logo_url",
  "sf_favicon_url",
] as const satisfies readonly StorefrontMerchantSettingKey[];

export type StorefrontSiteIdentityKey = (typeof STOREFRONT_SITE_IDENTITY_KEYS)[number];

export const STOREFRONT_MERCHANT_SETTINGS_DEFAULTS: Record<StorefrontMerchantSettingKey, string> = {
  sf_store_name: "",
  sf_site_tagline: "",
  sf_display_site_title_tagline: "1",
  sf_support_email: "",
  sf_logo_url: "",
  sf_favicon_url: "",
  sf_default_locale: "en",
  sf_currency_display: "symbol",
  sf_seo_default_title: "",
  sf_seo_default_description: "",
  sf_customer_accounts_enabled: "1",
  sf_maintenance_mode: "0",
  sf_checkout_brand_primary: "",
  sf_checkout_brand_accent: "",
  sf_stripe_enabled: "0",
  sf_stripe_mode: "sandbox",
  sf_stripe_publishable_key_sandbox: "",
  sf_stripe_secret_key_sandbox: "",
  sf_stripe_publishable_key_live: "",
  sf_stripe_secret_key_live: "",
  sf_paypal_enabled: "0",
  sf_paypal_mode: "sandbox",
  sf_paypal_client_id_sandbox: "",
  sf_paypal_client_secret_sandbox: "",
  sf_paypal_client_id_live: "",
  sf_paypal_client_secret_live: "",
};

/** Saved with `isPublic: false` so secrets are not exposed via public-setting reads. */
export const STOREFRONT_MERCHANT_SETTING_PRIVATE_KEYS = [
  "sf_stripe_publishable_key_sandbox",
  "sf_stripe_secret_key_sandbox",
  "sf_stripe_publishable_key_live",
  "sf_stripe_secret_key_live",
  "sf_paypal_client_id_sandbox",
  "sf_paypal_client_secret_sandbox",
  "sf_paypal_client_id_live",
  "sf_paypal_client_secret_live",
] as const satisfies readonly StorefrontMerchantSettingKey[];
