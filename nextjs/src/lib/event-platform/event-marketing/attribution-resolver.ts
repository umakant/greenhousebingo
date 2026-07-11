import type { RegistrationSourceType } from "@/lib/event-platform/event-marketing/attribution-constants";
import {
  ATTRIBUTION_RULE_LABELS,
  REGISTRATION_SOURCE_LABELS,
} from "@/lib/event-platform/event-marketing/attribution-constants";

export type RegistrationAttributionInput = {
  registrationSource?: string | null;
  sourceName?: string | null;
  campaignId?: string | null;
  affiliatePartnerId?: bigint | null;
  affiliateLinkId?: bigint | null;
  referralCode?: string | null;
  couponId?: bigint | null;
  couponCode?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  landingPage?: string | null;
  firstTouchAt?: Date | null;
  lastTouchAt?: Date | null;
};

export type ResolvedRegistrationAttribution = {
  sourceType: RegistrationSourceType;
  sourceLabel: string;
  campaign: string | null;
  ruleKey: keyof typeof ATTRIBUTION_RULE_LABELS;
  ruleLabel: string;
  isAttributed: boolean;
  affiliatePartnerId: string | null;
  promotionCode: string | null;
};

function normalizeSource(value: string | null | undefined): RegistrationSourceType | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, "_") as RegistrationSourceType;
  if (v in REGISTRATION_SOURCE_LABELS) return v;
  return null;
}

function mapUtmToSource(utmSource: string | null | undefined, utmMedium: string | null | undefined): RegistrationSourceType {
  const src = (utmSource ?? "").toLowerCase();
  const med = (utmMedium ?? "").toLowerCase();
  if (src.includes("facebook") || med.includes("facebook") || src === "fb") return "facebook";
  if (src.includes("instagram") || med.includes("instagram") || src === "ig") return "instagram";
  if (src.includes("google") || med.includes("cpc") || med.includes("ppc")) return "google";
  if (src.includes("email") || med.includes("email")) return "email";
  if (src.includes("sms") || med.includes("sms")) return "sms";
  if (src.includes("whatsapp") || med.includes("whatsapp")) return "whatsapp";
  return "other";
}

function isVenueHostSource(source: RegistrationSourceType): boolean {
  return source === "venue_website" || source === "venue_qr" || source === "host_link";
}

export function resolveRegistrationAttribution(
  reg: RegistrationAttributionInput & { paymentMethod?: string | null },
): ResolvedRegistrationAttribution {
  const campaign = reg.campaignId?.trim() || reg.utmCampaign?.trim() || null;

  if (reg.affiliatePartnerId || reg.affiliateLinkId) {
    return {
      sourceType: "affiliate",
      sourceLabel: reg.sourceName?.trim() || reg.referralCode?.trim() || "Affiliate",
      campaign,
      ruleKey: "affiliate",
      ruleLabel: ATTRIBUTION_RULE_LABELS.affiliate,
      isAttributed: true,
      affiliatePartnerId: reg.affiliatePartnerId?.toString() ?? null,
      promotionCode: null,
    };
  }

  if (reg.couponCode?.trim() || reg.couponId) {
    return {
      sourceType: "promotion_code",
      sourceLabel: reg.couponCode?.trim() || "Promotion",
      campaign,
      ruleKey: "promotion",
      ruleLabel: ATTRIBUTION_RULE_LABELS.promotion,
      isAttributed: true,
      affiliatePartnerId: null,
      promotionCode: reg.couponCode?.trim() ?? null,
    };
  }

  if (reg.referralCode?.trim()) {
    return {
      sourceType: "customer_referral",
      sourceLabel: reg.referralCode.trim(),
      campaign,
      ruleKey: "promotion",
      ruleLabel: ATTRIBUTION_RULE_LABELS.promotion,
      isAttributed: true,
      affiliatePartnerId: null,
      promotionCode: reg.referralCode.trim(),
    };
  }

  if (reg.utmSource?.trim() || reg.utmCampaign?.trim() || reg.utmMedium?.trim()) {
    const sourceType = mapUtmToSource(reg.utmSource, reg.utmMedium);
    return {
      sourceType,
      sourceLabel: reg.sourceName?.trim() || reg.utmSource?.trim() || REGISTRATION_SOURCE_LABELS[sourceType],
      campaign: reg.utmCampaign?.trim() || campaign,
      ruleKey: "utm",
      ruleLabel: ATTRIBUTION_RULE_LABELS.utm,
      isAttributed: true,
      affiliatePartnerId: null,
      promotionCode: null,
    };
  }

  const explicit = normalizeSource(reg.registrationSource);
  if (explicit && isVenueHostSource(explicit)) {
    return {
      sourceType: explicit,
      sourceLabel: reg.sourceName?.trim() || REGISTRATION_SOURCE_LABELS[explicit],
      campaign,
      ruleKey: "venue_host",
      ruleLabel: ATTRIBUTION_RULE_LABELS.venue_host,
      isAttributed: true,
      affiliatePartnerId: null,
      promotionCode: null,
    };
  }

  if (explicit === "walk_in" || reg.paymentMethod?.toLowerCase().includes("walk")) {
    return {
      sourceType: "walk_in",
      sourceLabel: REGISTRATION_SOURCE_LABELS.walk_in,
      campaign,
      ruleKey: "direct",
      ruleLabel: ATTRIBUTION_RULE_LABELS.direct,
      isAttributed: false,
      affiliatePartnerId: null,
      promotionCode: null,
    };
  }

  if (explicit === "organic") {
    return {
      sourceType: "organic",
      sourceLabel: REGISTRATION_SOURCE_LABELS.organic,
      campaign,
      ruleKey: "direct",
      ruleLabel: ATTRIBUTION_RULE_LABELS.direct,
      isAttributed: false,
      affiliatePartnerId: null,
      promotionCode: null,
    };
  }

  if (explicit) {
    return {
      sourceType: explicit,
      sourceLabel: reg.sourceName?.trim() || REGISTRATION_SOURCE_LABELS[explicit],
      campaign,
      ruleKey: explicit === "direct" ? "direct" : "utm",
      ruleLabel: explicit === "direct" ? ATTRIBUTION_RULE_LABELS.direct : ATTRIBUTION_RULE_LABELS.utm,
      isAttributed: explicit !== "direct" && explicit !== "unattributed",
      affiliatePartnerId: null,
      promotionCode: null,
    };
  }

  return {
    sourceType: "unattributed",
    sourceLabel: REGISTRATION_SOURCE_LABELS.unattributed,
    campaign: null,
    ruleKey: "direct",
    ruleLabel: ATTRIBUTION_RULE_LABELS.direct,
    isAttributed: false,
    affiliatePartnerId: null,
    promotionCode: null,
  };
}

export function buildRegistrationAttributionFields(input?: RegistrationAttributionInput | null) {
  if (!input) return {};
  return {
    registrationSource: input.registrationSource?.trim() || undefined,
    sourceName: input.sourceName?.trim() || undefined,
    campaignId: input.campaignId?.trim() || undefined,
    affiliatePartnerId: input.affiliatePartnerId ?? undefined,
    affiliateLinkId: input.affiliateLinkId ?? undefined,
    referralCode: input.referralCode?.trim() || undefined,
    couponId: input.couponId ?? undefined,
    couponCode: input.couponCode?.trim() || undefined,
    utmSource: input.utmSource?.trim() || undefined,
    utmMedium: input.utmMedium?.trim() || undefined,
    utmCampaign: input.utmCampaign?.trim() || undefined,
    utmContent: input.utmContent?.trim() || undefined,
    utmTerm: input.utmTerm?.trim() || undefined,
    landingPage: input.landingPage?.trim() || undefined,
    firstTouchAt: input.firstTouchAt ?? undefined,
    lastTouchAt: input.lastTouchAt ?? undefined,
  };
}

export function parseAttributionFromSearchParams(sp: URLSearchParams): RegistrationAttributionInput {
  const now = new Date();
  const hasTouch =
    sp.get("utm_source") ||
    sp.get("ref") ||
    sp.get("aff") ||
    sp.get("coupon") ||
    sp.get("promo");
  return {
    referralCode: sp.get("ref") ?? undefined,
    couponCode: sp.get("coupon") ?? sp.get("promo") ?? undefined,
    utmSource: sp.get("utm_source") ?? undefined,
    utmMedium: sp.get("utm_medium") ?? undefined,
    utmCampaign: sp.get("utm_campaign") ?? undefined,
    utmContent: sp.get("utm_content") ?? undefined,
    utmTerm: sp.get("utm_term") ?? undefined,
    landingPage: sp.get("landing") ?? undefined,
    registrationSource: sp.get("src") ?? undefined,
    sourceName: sp.get("source_name") ?? undefined,
    campaignId: sp.get("campaign_id") ?? sp.get("utm_campaign") ?? undefined,
    firstTouchAt: hasTouch ? now : undefined,
    lastTouchAt: hasTouch ? now : undefined,
  };
}
