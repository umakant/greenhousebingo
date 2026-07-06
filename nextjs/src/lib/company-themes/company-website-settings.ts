import "server-only";

import { companyWebsiteOwnerId, type CompanyWebsiteUser } from "@/lib/company-themes/company-website-access";
import { getSettingsForOwner } from "@/lib/settings-service";
import { prisma } from "@/lib/prisma";

/** Stored per company account — never merged from platform superadmin settings. */
export const COMPANY_WEBSITE_SETTING_KEYS = ["companyNextjsThemeSlug", "companyNextjsThemeCustomizer"] as const;

export type CompanyWebsiteSettings = {
  ownerId: bigint;
  slug: string;
  customizerRaw: string;
};

export async function getCompanyWebsiteSettingsForOwnerId(ownerId: bigint): Promise<CompanyWebsiteSettings> {
  const settings = await getSettingsForOwner(ownerId);
  return {
    ownerId,
    slug: (settings.companyNextjsThemeSlug ?? "").trim(),
    customizerRaw: settings.companyNextjsThemeCustomizer ?? "",
  };
}

export async function getCompanyWebsiteSettingsForUser(
  user: CompanyWebsiteUser,
): Promise<CompanyWebsiteSettings | null> {
  const ownerId = companyWebsiteOwnerId(user);
  if (!ownerId) return null;
  return getCompanyWebsiteSettingsForOwnerId(ownerId);
}

export async function getCompanyWebsiteSettingsForUserId(userId: bigint): Promise<CompanyWebsiteSettings | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user) return null;
  return getCompanyWebsiteSettingsForUser(user);
}

export function applyCompanyWebsiteSettingsToBlob(
  target: Record<string, string>,
  companyWebsite: CompanyWebsiteSettings | null,
): void {
  if (!companyWebsite) {
    target.companyNextjsThemeSlug = "";
    target.companyNextjsThemeCustomizer = "";
    return;
  }
  target.companyNextjsThemeSlug = companyWebsite.slug;
  target.companyNextjsThemeCustomizer = companyWebsite.customizerRaw;
}
