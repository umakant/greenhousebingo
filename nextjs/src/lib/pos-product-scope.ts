import { getPosCompanyId } from "@/lib/pos-api";

/** List/filter POS products to the current company tenant when `organizationId` is set on rows. */
export async function posProductTenantWhere(): Promise<{ organizationId: bigint } | Record<string, never>> {
  const orgId = await getPosCompanyId();
  if (orgId == null) return {};
  return { organizationId: orgId };
}

export async function requirePosOrgId(): Promise<bigint | null> {
  return getPosCompanyId();
}
