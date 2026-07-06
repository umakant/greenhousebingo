import "server-only";

import { findDomainByHostname } from "@/lib/storefront/services/domain-service";
import { storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

export type PublicStorefrontHostContext = {
  organizationId: bigint;
  websiteId: bigint;
  hostname: string;
};

/** Resolve tenant from Host (same as `/shop` public pages). */
export async function getPublicStorefrontContextFromHost(hostHeader: string | null): Promise<PublicStorefrontHostContext | null> {
  const hostRaw = hostHeader ?? "";
  const hostname = storefrontHostnameForLookup(hostRaw);
  if (!hostname) return null;
  try {
    const domain = await findDomainByHostname(hostname);
    if (!domain?.website) return null;
    return {
      organizationId: domain.website.organizationId,
      websiteId: domain.website.id,
      hostname,
    };
  } catch (e) {
    console.error("[getPublicStorefrontContextFromHost] lookup failed:", hostname, e);
    return null;
  }
}
