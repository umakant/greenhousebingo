import "server-only";

import { getEnabledLanguageRows } from "@/lib/language-catalog";
import { resolveAvailableLanguages } from "@/lib/settings-page-data";
import { getSettingsForOwner, getSuperadminId, type SettingsBlob } from "@/lib/settings-service";

import {
  STOREFRONT_MERCHANT_SETTING_KEYS,
  STOREFRONT_MERCHANT_SETTINGS_DEFAULTS,
  type StorefrontMerchantSettingKey,
} from "./storefront-settings-keys";

function isBlankSettingValue(v: string | undefined | null): boolean {
  return !(v ?? "").trim();
}

/** Platform defaults merged with company-owned settings rows (System Settings inheritance). */
export async function getMergedOrganizationSettings(organizationId: bigint): Promise<SettingsBlob> {
  const owner = await getSettingsForOwner(organizationId);
  const superadminId = await getSuperadminId();
  const platform = await getSettingsForOwner(superadminId);
  return { ...platform, ...owner };
}

export type ResolvedMerchantSettingsPayload = {
  data: Record<StorefrontMerchantSettingKey, string>;
  availableLanguages: ReturnType<typeof getEnabledLanguageRows>;
  defaultCurrency: string;
};

/** Storefront merchant keys with inherited defaults from organization System / Currency settings. */
export async function resolveMerchantSettingsForOrganization(
  organizationId: bigint,
): Promise<ResolvedMerchantSettingsPayload> {
  const ownerOnly = await getSettingsForOwner(organizationId);
  const merged = await getMergedOrganizationSettings(organizationId);

  const data = {} as Record<StorefrontMerchantSettingKey, string>;
  for (const k of STOREFRONT_MERCHANT_SETTING_KEYS) {
    const owned = (ownerOnly[k] ?? "").trim();
    data[k] = owned || STOREFRONT_MERCHANT_SETTINGS_DEFAULTS[k];
  }

  if (isBlankSettingValue(ownerOnly.sf_default_locale)) {
    const inherited = (merged.defaultLanguage ?? "").trim();
    if (inherited) data.sf_default_locale = inherited;
  }

  const availableLanguages = getEnabledLanguageRows(await resolveAvailableLanguages(merged));
  const defaultCurrency = (merged.defaultCurrency ?? "USD").trim() || "USD";

  return { data, availableLanguages, defaultCurrency };
}

/** Settings blob for public storefront runtime (merged org + resolved merchant keys). */
export async function resolveStorefrontSettingsRaw(organizationId: bigint): Promise<Record<string, string>> {
  const { data } = await resolveMerchantSettingsForOrganization(organizationId);
  const merged = await getMergedOrganizationSettings(organizationId);
  return { ...merged, ...data };
}
