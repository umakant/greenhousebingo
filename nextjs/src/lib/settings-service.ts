import { prisma } from "@/lib/prisma";
import { companyBrandFooterText, companyBrandTitleText } from "@/lib/brand-text-defaults";
import { mergeSmtpFromEnv } from "@/lib/smtp-from-env";
import {
  applyCompanyWebsiteSettingsToBlob,
  getCompanyWebsiteSettingsForUser,
} from "@/lib/company-themes/company-website-settings";
import { sanitizeCompanyWebsiteSettingsForClient } from "@/lib/company-themes/company-website-access-shared";

export type SettingsBlob = Record<string, string>;

const SUPERADMIN_MERGE_KEYS = [
  "decimalFormat",
  "decimalSeparator",
  "defaultCurrency",
  "thousandsSeparator",
  "floatNumber",
  "currencySymbolSpace",
  "currencySymbolPosition",
  "dateFormat",
  "timeFormat",
  "calendarStartDay",
  "defaultTimezone",
  /** App locale + catalog merged for tenants (System Settings). */
  "defaultLanguage",
  "language_catalog",
  "enableCookiePopup",
  "enableLogging",
  "strictlyNecessaryCookies",
  "cookieTitle",
  "cookieDescription",
  "strictlyCookieTitle",
  "strictlyCookieDescription",
  "contactUsDescription",
  "contactUsUrl",
  /** Shared Places key for address autocomplete (company inherits when unset). */
  "googleMapsApiKey",
] as const;

/** Brand keys merged from superadmin for all users so company dashboard shows same logo/powered-by. */
export const BRAND_MERGE_KEYS = [
  "logo_dark",
  "logo_light",
  "favicon",
  "logo_icon",
  "powered_by_light",
  "powered_by_dark",
  "titleText",
  "footerText",
  "sidebarVariant",
  "sidebarStyle",
  "layoutDirection",
  "themeMode",
  "themeColor",
  "customColor",
  "loginImage",
  "loginBgColor",
  "loginFormBgColor",
] as const;

export const BRAND_LOGO_KEYS = ["logo_light", "logo_dark", "favicon"] as const;

type UserRow = {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
};

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return prisma.user.findFirst({
    where: { email: normalized },
    select: { id: true, type: true, createdBy: true },
  });
}

export async function getSuperadminId(): Promise<bigint> {
  const superadmin = await prisma.user.findFirst({ where: { type: "superadmin" }, select: { id: true } });
  return superadmin?.id ?? 1n;
}

export function settingsOwnerIdForUser(user: UserRow): bigint {
  // Laravel logic:
  // - superadmin/company: use self id
  // - other roles: use created_by (company) when available
  const type = (user.type ?? "").toLowerCase();
  if (type === "superadmin" || type === "company") return user.id;
  if (user.createdBy != null) return user.createdBy;
  return user.id;
}

export async function getSettingsForOwner(ownerId: bigint): Promise<SettingsBlob> {
  const rows = await prisma.setting.findMany({
    where: { createdBy: ownerId },
    select: { key: true, value: true },
  });
  const out: SettingsBlob = {};
  for (const r of rows) out[r.key] = r.value ?? "";
  return out;
}

/** System (superadmin) date prefs for public pages without auth (e.g. public forms). Matches Settings → System. */
export async function getSuperadminDateDisplayPrefs(): Promise<{ dateFormat: string; calendarStartDay: string }> {
  const ownerId = await getSuperadminId();
  const s = await getSettingsForOwner(ownerId);
  return {
    dateFormat: (s.dateFormat ?? "").trim() || "Y-m-d",
    calendarStartDay: (s.calendarStartDay ?? "").trim() || "0",
  };
}

/** Keys stored under Email Settings; merged from superadmin when company rows are empty (matches Laravel admin_setting fallback). */
export const EFFECTIVE_MAIL_SETTING_KEYS = [
  "email_provider",
  "email_driver",
  "email_host",
  "email_port",
  "email_username",
  "email_password",
  "email_encryption",
  "email_fromAddress",
  "email_fromName",
] as const;

/** Shown in Email Settings UI for company users (no password — avoids exposing superadmin credentials to the browser). */
export const MAIL_UI_MERGE_KEYS = [
  "email_provider",
  "email_driver",
  "email_host",
  "email_port",
  "email_username",
  "email_encryption",
  "email_fromAddress",
  "email_fromName",
] as const;

function isBlankSettingValue(v: string | undefined): boolean {
  return (v ?? "").trim() === "";
}

/** True when the company tenant has saved at least one SMTP field (not inheriting everything). */
export function companyHasOwnMailSettings(companyOnly: SettingsBlob): boolean {
  return EFFECTIVE_MAIL_SETTING_KEYS.some((key) => !isBlankSettingValue(companyOnly[key]));
}

/** Fill blank mail UI fields from platform (superadmin) defaults for display. */
export function applyMailSettingsFallback(
  target: SettingsBlob,
  fallback: SettingsBlob,
  keys: readonly string[] = MAIL_UI_MERGE_KEYS,
): void {
  for (const key of keys) {
    if (isBlankSettingValue(target[key])) {
      const fb = fallback[key];
      if (!isBlankSettingValue(fb)) target[key] = fb ?? "";
    }
  }
}

/** Fill blank brand fields from platform (superadmin) defaults for display and runtime. */
export function applyBrandSettingsFallback(
  target: SettingsBlob,
  fallback: SettingsBlob,
  keys: readonly string[] = BRAND_MERGE_KEYS,
): void {
  for (const key of keys) {
    if (isBlankSettingValue(target[key])) {
      const fb = fallback[key];
      if (!isBlankSettingValue(fb)) target[key] = fb ?? "";
    }
  }
}

async function resolveCompanyDisplayName(ownerId: bigint): Promise<string> {
  const [stored, companyUser] = await Promise.all([
    getSettingsForOwner(ownerId),
    prisma.user.findFirst({
      where: { id: ownerId, type: { in: ["company", "company_admin"] } },
      select: { name: true },
    }),
  ]);
  return (stored.company_name ?? "").trim() || (companyUser?.name ?? "").trim();
}

/**
 * Company tenants use their legal name in title/footer — not inherited platform branding (SecurX/WorkDo).
 * Only when the company has not saved its own titleText/footerText.
 */
export function applyCompanyBrandTextFallback(
  merged: SettingsBlob,
  companyOnly: SettingsBlob,
  companyName: string,
): void {
  const name = companyName.trim();
  if (!name) return;

  if (isBlankSettingValue(companyOnly.titleText)) {
    merged.titleText = companyBrandTitleText(name);
  }
  if (isBlankSettingValue(companyOnly.footerText)) {
    const footer = companyBrandFooterText(name);
    if (footer) merged.footerText = footer;
  }
}

/** True when the company tenant saved its own logo and favicon (Launchpad go-live). */
export function companyHasOwnBrandLogos(companyOnly: SettingsBlob): boolean {
  const hasLogo =
    !isBlankSettingValue(companyOnly.logo_light) || !isBlankSettingValue(companyOnly.logo_dark);
  return hasLogo && !isBlankSettingValue(companyOnly.favicon);
}

/** Brand identity for `ownerId`, falling back per-key to superadmin when the company has not set a value. */
export async function getEffectiveBrandSettings(ownerId: bigint): Promise<SettingsBlob> {
  const owner = await getSettingsForOwner(ownerId);
  const superadminId = await getSuperadminId();
  if (ownerId === superadminId) return owner;
  const sup = await getSettingsForOwner(superadminId);
  const out: SettingsBlob = { ...owner };
  applyBrandSettingsFallback(out, sup);
  const reconciled = reconcileCompanyBrandLogos(owner, out);
  const companyName = await resolveCompanyDisplayName(ownerId);
  applyCompanyBrandTextFallback(reconciled, owner, companyName);
  if (companyName) reconciled.company_name = companyName;
  return reconciled;
}

/**
 * When a company uploads only one sidebar logo, use it for both themes instead of
 * inheriting the superadmin logo for the missing slot (e.g. Philly logo in dark mode only).
 */
export function reconcileCompanyBrandLogos(companyOnly: SettingsBlob, merged: SettingsBlob): SettingsBlob {
  const companyLight = (companyOnly.logo_light ?? "").trim();
  const companyDark = (companyOnly.logo_dark ?? "").trim();
  if (!companyLight && !companyDark) return merged;

  const out = { ...merged };
  if (companyLight && !companyDark) out.logo_dark = companyLight;
  if (companyDark && !companyLight) out.logo_light = companyDark;
  return out;
}

/**
 * SMTP + mail identity for `ownerId`, falling back per-key to superadmin when the company has not set a value.
 */
export async function getEffectiveMailSettings(ownerId: bigint): Promise<SettingsBlob> {
  const owner = await getSettingsForOwner(ownerId);
  const superadminId = await getSuperadminId();
  if (ownerId === superadminId) return owner;
  const sup = await getSettingsForOwner(superadminId);
  const out: SettingsBlob = { ...owner };
  for (const key of EFFECTIVE_MAIL_SETTING_KEYS) {
    if (isBlankSettingValue(out[key])) {
      const fb = sup[key];
      if (!isBlankSettingValue(fb)) out[key] = fb ?? "";
    }
  }
  return mergeSmtpFromEnv(out);
}

/** Platform product name for emails/UI — superadmin brand settings, then env; never hardcode a tenant-specific name. */
export function resolvePlatformAppName(settings: SettingsBlob): string {
  for (const key of ["company_name", "titleText", "email_fromName"] as const) {
    const v = (settings[key] ?? "").trim();
    if (v) return v;
  }
  const env = (process.env.NEXT_PUBLIC_APP_NAME ?? "").trim();
  if (env) return env;
  return "Green House Bingo";
}

export async function getPlatformAppName(): Promise<string> {
  const superadminId = await getSuperadminId();
  const settings = await getSettingsForOwner(superadminId);
  return resolvePlatformAppName(settings);
}

export async function getMergedSettingsForUserEmail(email: string, appUrl: string): Promise<SettingsBlob> {
  const user = await getUserByEmail(email);
  const superadminId = await getSuperadminId();

  if (!user) {
    const base: SettingsBlob = {};
    base.base_url = appUrl;
    base.image_url = appUrl;
    base.asset_url = appUrl;
    base.app_url = appUrl;
    base.is_demo = "false";
    return base;
  }

  const ownerId = settingsOwnerIdForUser(user);
  let userSettings = await getSettingsForOwner(ownerId);
  const companyBrandOnly = { ...userSettings };

  const isSuperadmin = (user.type ?? "").toLowerCase() === "superadmin";
  if (!isSuperadmin) {
    const mergeKeys = [...SUPERADMIN_MERGE_KEYS, ...BRAND_MERGE_KEYS, ...MAIL_UI_MERGE_KEYS];
    const superRows = await prisma.setting.findMany({
      where: { createdBy: superadminId, key: { in: mergeKeys } },
      select: { key: true, value: true },
    });
    const superSettings: SettingsBlob = {};
    for (const r of superRows) superSettings[r.key] = r.value ?? "";
    userSettings = { ...superSettings, ...userSettings };
    applyBrandSettingsFallback(userSettings, superSettings);
    applyMailSettingsFallback(userSettings, superSettings);
    userSettings = reconcileCompanyBrandLogos(companyBrandOnly, userSettings);
    const companyName = await resolveCompanyDisplayName(ownerId);
    applyCompanyBrandTextFallback(userSettings, companyBrandOnly, companyName);
    if (companyName) userSettings.company_name = companyName;

    const companyAccount = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { slug: true },
    });
    const companySlug = companyAccount?.slug?.trim();
    if (companySlug) userSettings.company_slug = companySlug;
  }

  const companyWebsite = await getCompanyWebsiteSettingsForUser(user);
  applyCompanyWebsiteSettingsToBlob(userSettings, companyWebsite);

  userSettings.base_url = appUrl;
  userSettings.image_url = appUrl;
  userSettings.asset_url = appUrl;
  userSettings.app_url = appUrl;
  userSettings.is_demo = "false";
  return sanitizeCompanyWebsiteSettingsForClient(userSettings);
}

async function nextSettingId(): Promise<bigint> {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function upsertOwnerSettings(
  ownerId: bigint,
  items: Array<{ key: string; value: string; isPublic?: boolean }>,
): Promise<void> {
  for (const it of items) {
    const existing = await prisma.setting.findFirst({
      where: { key: it.key, createdBy: ownerId },
      select: { id: true },
    });
    if (existing?.id) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: it.value, isPublic: it.isPublic ?? true, updatedAt: new Date() },
      });
      continue;
    }
    await prisma.setting.create({
      data: {
        id: await nextSettingId(),
        key: it.key,
        value: it.value,
        isPublic: it.isPublic ?? true,
        createdBy: ownerId,
        createdAt: new Date(),
      },
    });
  }
}

