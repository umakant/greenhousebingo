export const REGISTRATION_SOURCE_TYPES = [
  "direct",
  "organic",
  "facebook",
  "instagram",
  "google",
  "email",
  "sms",
  "whatsapp",
  "venue_website",
  "venue_qr",
  "host_link",
  "affiliate",
  "customer_referral",
  "promotion_code",
  "walk_in",
  "other",
  "unattributed",
] as const;

export type RegistrationSourceType = (typeof REGISTRATION_SOURCE_TYPES)[number];

export const REGISTRATION_SOURCE_LABELS: Record<RegistrationSourceType, string> = {
  direct: "Direct",
  organic: "Organic",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  venue_website: "Venue Website",
  venue_qr: "Venue QR Code",
  host_link: "Host Link",
  affiliate: "Affiliate",
  customer_referral: "Customer Referral",
  promotion_code: "Promotion Code",
  walk_in: "Walk-In",
  other: "Other",
  unattributed: "Unattributed",
};

export const ATTRIBUTION_RULE_DESCRIPTION =
  "Primary attribution (one bucket per registration): 1) Affiliate tracking code or partner ID, 2) Promotion or referral code, 3) UTM campaign parameters, 4) Venue or host tracking link, 5) Direct or organic. Registrations are never double-counted across summary totals.";

export const ATTRIBUTION_RULE_ORDER = [
  "affiliate",
  "promotion",
  "utm",
  "venue_host",
  "direct",
] as const;

export type AttributionRuleKey = (typeof ATTRIBUTION_RULE_ORDER)[number];

export const ATTRIBUTION_RULE_LABELS: Record<AttributionRuleKey, string> = {
  affiliate: "Affiliate tracking",
  promotion: "Promotion / referral code",
  utm: "Campaign UTM",
  venue_host: "Venue / host link",
  direct: "Direct / organic",
};
