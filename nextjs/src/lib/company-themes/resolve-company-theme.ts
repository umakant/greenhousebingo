import "server-only";

import { getCompanyNextjsTheme } from "@/lib/company-themes/registry";
import { companyWebsiteOwnerId } from "@/lib/company-themes/company-website-access";
import { getCompanyWebsiteSettingsForOwnerId } from "@/lib/company-themes/company-website-settings";
import { getUserByEmail } from "@/lib/settings-service";
import { prisma } from "@/lib/prisma";

export async function resolveCompanyThemeSlugForOwnerId(ownerId: bigint): Promise<string | null> {
  const settings = await getCompanyWebsiteSettingsForOwnerId(ownerId);
  return settings.slug || null;
}

export async function resolveCompanyThemeSlugForUserId(userId: bigint): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user) return null;
  const ownerId = companyWebsiteOwnerId(user);
  if (!ownerId) return null;
  return resolveCompanyThemeSlugForOwnerId(ownerId);
}

export async function resolveCompanyThemeSlugForEmail(email: string): Promise<string | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const ownerId = companyWebsiteOwnerId(user);
  if (!ownerId) return null;
  return resolveCompanyThemeSlugForOwnerId(ownerId);
}

export async function resolveActiveCompanyThemeForUserId(userId: bigint) {
  const slug = await resolveCompanyThemeSlugForUserId(userId);
  return getCompanyNextjsTheme(slug);
}
