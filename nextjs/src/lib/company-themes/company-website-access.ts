import "server-only";

import { isSuperAdminFromRoleCookies } from "@/lib/authz";
import { getCompanyNextjsTheme } from "@/lib/company-themes/registry";
import { loadCompanyProfileUser } from "@/lib/company-profile-settings";
import { getSettingsForOwner } from "@/lib/settings-service";

export type CompanyWebsiteUser = {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
};

/** Settings owner for a company's public marketing site (never the platform superadmin). */
export function companyWebsiteOwnerId(user: CompanyWebsiteUser): bigint | null {
  const type = (user.type ?? "").trim().toLowerCase();
  if (type === "superadmin") return null;
  if (type === "company") return user.id;
  if (user.createdBy != null) return user.createdBy;
  return null;
}

export function canUseCompanyWebsite(user: CompanyWebsiteUser): boolean {
  return companyWebsiteOwnerId(user) != null;
}

export function isPlatformSuperAdminSession(role?: string | null, rolesJson?: string | null): boolean {
  return isSuperAdminFromRoleCookies(role ?? undefined, rolesJson ?? undefined);
}

/** Label shown on the public password gate (company name, then theme, then account name). */
export async function getCompanyWebsiteAccessLabel(
  ownerId: bigint,
  companySlug: string,
): Promise<string> {
  const [settings, companyUser] = await Promise.all([
    getSettingsForOwner(ownerId),
    loadCompanyProfileUser(ownerId),
  ]);

  const companyName = (settings.company_name ?? "").trim();
  if (companyName) return companyName;

  const theme = getCompanyNextjsTheme(settings.companyNextjsThemeSlug);
  if (theme?.name) return theme.name;

  const accountName = (companyUser?.name ?? "").trim();
  if (accountName) return accountName;

  return companySlug;
}
