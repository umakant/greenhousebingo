import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The Water Ice Express landing store is owned by a dedicated, superadmin-managed
 * organization that is intentionally separate from customer companies (it is hidden
 * from the Companies list because its `type` is not company/company_admin). Its
 * products, categories, and landing orders all live under this org so they never
 * mix with any company's catalog.
 */
export const WATERICE_STORE_ORG_EMAIL = "store@waterice-express.internal";
export const WATERICE_STORE_ORG_NAME = "Water Ice Express";
export const WATERICE_STORE_ORG_TYPE = "platform";

let cachedOrgId: bigint | null = null;

/** Resolve the dedicated store org id (env override, else reserved-email lookup). */
export async function resolveWaterIceStoreOrgId(): Promise<bigint | null> {
  if (cachedOrgId != null) return cachedOrgId;

  const envRaw = (process.env.WATERICE_STORE_ORG_ID ?? "").trim();
  if (/^\d+$/.test(envRaw)) {
    cachedOrgId = BigInt(envRaw);
    return cachedOrgId;
  }

  const row = await prisma.user.findFirst({
    where: { email: WATERICE_STORE_ORG_EMAIL },
    select: { id: true },
  });
  if (row) cachedOrgId = row.id;
  return cachedOrgId;
}

/** Resolve the store org + its primary website (orders require a websiteId). */
export async function resolveWaterIceStoreContext(): Promise<{
  organizationId: bigint;
  websiteId: bigint;
} | null> {
  const organizationId = await resolveWaterIceStoreOrgId();
  if (organizationId == null) return null;
  const website = await prisma.website.findFirst({
    where: { organizationId },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!website) return null;
  return { organizationId, websiteId: website.id };
}
