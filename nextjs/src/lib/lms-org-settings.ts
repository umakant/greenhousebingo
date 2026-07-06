import "server-only";

import { getSettingsForOwner, upsertOwnerSettings } from "@/lib/settings-service";
import { prisma } from "@/lib/prisma";

export const LMS_SETTING_KEYS = {
  maintenanceMode: "lms_maintenance_mode",
  maintenanceMessage: "lms_maintenance_message",
  mobileOnlyMode: "lms_mobile_only_mode",
  defaultLocale: "lms_default_locale",
  rtlMode: "lms_rtl_mode",
  gdprEnabled: "lms_gdpr_enabled",
  gdprRequireConsent: "lms_gdpr_require_consent",
  gdprBannerText: "lms_gdpr_banner_text",
  primaryColor: "lms_primary_color",
  fontFamily: "lms_font_family",
  adBannersJson: "lms_ad_banners_json",
  firstPurchaseCouponCode: "lms_first_purchase_coupon_code",
  updateWebhookUrl: "lms_update_webhook_url",
  updateLastVersion: "lms_update_last_version",
} as const;

export type LmsAdBanner = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
};

export type LmsRtlMode = "inherit" | "ltr" | "rtl";

export type LmsOrgSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  mobileOnlyMode: boolean;
  defaultLocale: string;
  rtlMode: LmsRtlMode;
  gdprEnabled: boolean;
  gdprRequireConsent: boolean;
  gdprBannerText: string;
  primaryColor: string;
  fontFamily: string;
  adBanners: LmsAdBanner[];
  firstPurchaseCouponCode: string;
  updateWebhookUrl: string;
  updateLastVersion: string;
};

export const DEFAULT_LMS_ORG_SETTINGS: LmsOrgSettings = {
  maintenanceMode: false,
  maintenanceMessage: "The learning portal is temporarily unavailable. Please check back soon.",
  mobileOnlyMode: false,
  defaultLocale: "",
  rtlMode: "inherit",
  gdprEnabled: false,
  gdprRequireConsent: true,
  gdprBannerText:
    "We use cookies and process learning activity data to deliver courses. See our privacy policy for details.",
  primaryColor: "",
  fontFamily: "",
  adBanners: [],
  firstPurchaseCouponCode: "",
  updateWebhookUrl: "",
  updateLastVersion: "",
};

function bool(v: string | undefined, fallback = false): boolean {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function parseAdBanners(raw: string | undefined): LmsAdBanner[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((row, i) => {
        const o = row as Record<string, unknown>;
        return {
          id: String(o.id ?? `banner-${i}`),
          title: String(o.title ?? ""),
          imageUrl: String(o.imageUrl ?? ""),
          linkUrl: String(o.linkUrl ?? ""),
          active: o.active !== false,
        };
      })
      .filter((b) => b.title || b.imageUrl);
  } catch {
    return [];
  }
}

export function parseLmsOrgSettings(blob: Record<string, string>): LmsOrgSettings {
  const rtlRaw = (blob[LMS_SETTING_KEYS.rtlMode] ?? "inherit").trim().toLowerCase();
  const rtlMode: LmsRtlMode =
    rtlRaw === "ltr" || rtlRaw === "rtl" ? rtlRaw : "inherit";

  return {
    maintenanceMode: bool(blob[LMS_SETTING_KEYS.maintenanceMode]),
    maintenanceMessage:
      blob[LMS_SETTING_KEYS.maintenanceMessage]?.trim() || DEFAULT_LMS_ORG_SETTINGS.maintenanceMessage,
    mobileOnlyMode: bool(blob[LMS_SETTING_KEYS.mobileOnlyMode]),
    defaultLocale: blob[LMS_SETTING_KEYS.defaultLocale]?.trim() ?? "",
    rtlMode,
    gdprEnabled: bool(blob[LMS_SETTING_KEYS.gdprEnabled]),
    gdprRequireConsent: bool(blob[LMS_SETTING_KEYS.gdprRequireConsent], true),
    gdprBannerText:
      blob[LMS_SETTING_KEYS.gdprBannerText]?.trim() || DEFAULT_LMS_ORG_SETTINGS.gdprBannerText,
    primaryColor: blob[LMS_SETTING_KEYS.primaryColor]?.trim() ?? "",
    fontFamily: blob[LMS_SETTING_KEYS.fontFamily]?.trim() ?? "",
    adBanners: parseAdBanners(blob[LMS_SETTING_KEYS.adBannersJson]),
    firstPurchaseCouponCode: blob[LMS_SETTING_KEYS.firstPurchaseCouponCode]?.trim() ?? "",
    updateWebhookUrl: blob[LMS_SETTING_KEYS.updateWebhookUrl]?.trim() ?? "",
    updateLastVersion: blob[LMS_SETTING_KEYS.updateLastVersion]?.trim() ?? "",
  };
}

export function serializeLmsOrgSettings(s: LmsOrgSettings): Array<{ key: string; value: string }> {
  return [
    { key: LMS_SETTING_KEYS.maintenanceMode, value: s.maintenanceMode ? "1" : "0" },
    { key: LMS_SETTING_KEYS.maintenanceMessage, value: s.maintenanceMessage },
    { key: LMS_SETTING_KEYS.mobileOnlyMode, value: s.mobileOnlyMode ? "1" : "0" },
    { key: LMS_SETTING_KEYS.defaultLocale, value: s.defaultLocale },
    { key: LMS_SETTING_KEYS.rtlMode, value: s.rtlMode },
    { key: LMS_SETTING_KEYS.gdprEnabled, value: s.gdprEnabled ? "1" : "0" },
    { key: LMS_SETTING_KEYS.gdprRequireConsent, value: s.gdprRequireConsent ? "1" : "0" },
    { key: LMS_SETTING_KEYS.gdprBannerText, value: s.gdprBannerText },
    { key: LMS_SETTING_KEYS.primaryColor, value: s.primaryColor },
    { key: LMS_SETTING_KEYS.fontFamily, value: s.fontFamily },
    { key: LMS_SETTING_KEYS.adBannersJson, value: JSON.stringify(s.adBanners) },
    { key: LMS_SETTING_KEYS.firstPurchaseCouponCode, value: s.firstPurchaseCouponCode },
    { key: LMS_SETTING_KEYS.updateWebhookUrl, value: s.updateWebhookUrl },
    { key: LMS_SETTING_KEYS.updateLastVersion, value: s.updateLastVersion },
  ];
}

export async function readLmsOrgSettings(organizationId: bigint): Promise<LmsOrgSettings> {
  const blob = await getSettingsForOwner(organizationId);
  const keys = Object.values(LMS_SETTING_KEYS);
  const hasAny = keys.some((k) => (blob[k] ?? "").trim() !== "");
  if (!hasAny) return { ...DEFAULT_LMS_ORG_SETTINGS };
  return parseLmsOrgSettings(blob);
}

export async function writeLmsOrgSettings(
  organizationId: bigint,
  settings: LmsOrgSettings,
): Promise<void> {
  await upsertOwnerSettings(organizationId, serializeLmsOrgSettings(settings));
}

/** Resolve effective RTL for LMS learner UI. */
export async function resolveLmsRtl(organizationId: bigint): Promise<"ltr" | "rtl"> {
  const lms = await readLmsOrgSettings(organizationId);
  if (lms.rtlMode === "rtl") return "rtl";
  if (lms.rtlMode === "ltr") return "ltr";
  const brand = await getSettingsForOwner(organizationId);
  return (brand.layoutDirection ?? "").trim() === "rtl" ? "rtl" : "ltr";
}

/** Whether learner has any prior paid LMS-related storefront order (for first-purchase coupon). */
export async function learnerIsFirstLmsPurchase(params: {
  organizationId: bigint;
  studentUserId: bigint;
}): Promise<boolean> {
  const [enrollmentCount, orderCount] = await Promise.all([
    prisma.enrollment.count({
      where: {
        organizationId: params.organizationId,
        studentUserId: params.studentUserId,
        storefrontOrderId: { not: null },
      },
    }),
    prisma.storefrontOrder.count({
      where: {
        organizationId: params.organizationId,
        OR: [
          { storefrontCustomer: { linkedUserId: params.studentUserId } },
          { crmCustomer: { userId: params.studentUserId } },
        ],
      },
    }),
  ]);
  return enrollmentCount === 0 && orderCount === 0;
}
