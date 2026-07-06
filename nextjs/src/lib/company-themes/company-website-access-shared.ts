export const COMPANY_WEBSITE_PASSWORD_SETTING_KEYS = [
  "companyWebsitePasswordProtected",
  "companyWebsiteAccessPasswordHash",
] as const;

export type CompanyWebsiteAccessSettings = {
  passwordProtected: boolean;
  passwordHash: string;
};

export function isTruthySettingValue(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function companySiteAccessCookieName(companySlug: string): string {
  return `company_site_access_${encodeURIComponent(companySlug)}`;
}

export function sanitizeCompanyWebsiteSettingsForClient(
  settings: Record<string, string>,
): Record<string, string> {
  const out = { ...settings };
  const hasPassword = Boolean((out.companyWebsiteAccessPasswordHash ?? "").trim());
  delete out.companyWebsiteAccessPasswordHash;
  out.companyWebsiteHasAccessPassword = hasPassword ? "1" : "0";
  return out;
}
