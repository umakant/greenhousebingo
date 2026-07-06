import "server-only";

import { isStorefrontAppHost } from "@/lib/storefront/custom-domain-hosts";
import { findDomainByHostname } from "@/lib/storefront/services/domain-service";
import { isLiveStorefrontDomain } from "@/lib/storefront/storefront-domain-live";

/** True when this hostname is a merchant domain (e.g. phillywaterice.com), not the Paper Flight app host. */
export async function isMerchantStorefrontHostname(hostname: string): Promise<boolean> {
  const h = hostname.trim().toLowerCase();
  if (!h || isStorefrontAppHost(h)) return false;
  const domain = await findDomainByHostname(h);
  return isLiveStorefrontDomain(domain);
}
