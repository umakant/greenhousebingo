import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveStorefrontSettingsRaw } from "@/lib/storefront/resolve-merchant-settings";
import { buildPublicStorefrontSettings, type PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";

/** Resolve merchant storefront branding for a website id (e.g. customer account routes). */
export async function getPublicBrandSettingsForWebsiteId(
  websiteId: string,
): Promise<PublicStorefrontBrandSettings | null> {
  if (!/^\d+$/.test(websiteId.trim())) return null;
  let wid: bigint;
  try {
    wid = BigInt(websiteId.trim());
  } catch {
    return null;
  }
  const site = await prisma.website.findFirst({
    where: { id: wid },
    select: { organizationId: true },
  });
  if (!site) return null;
  const raw = await resolveStorefrontSettingsRaw(site.organizationId);
  return buildPublicStorefrontSettings(raw);
}
