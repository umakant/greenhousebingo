import type { NextRequest } from "next/server";

import { STOREFRONT_CUSTOMER_SESSION_COOKIE } from "@/lib/storefront-customer-constants";
import type { StorefrontCustomerSessionContext } from "@/lib/storefront-customer-session";
import { verifyStorefrontCustomerSessionToken } from "@/lib/storefront-customer-session";

/**
 * Resolve B2C session from `sfc_session` (never `pf_*`). Optional `expectedWebsiteId`
 * enforces tenant scope when the route is website-specific.
 */
export async function getStorefrontCustomerFromRequest(
  req: NextRequest,
  expectedWebsiteId?: bigint | null,
): Promise<StorefrontCustomerSessionContext | null> {
  const raw = req.cookies.get(STOREFRONT_CUSTOMER_SESSION_COOKIE)?.value;
  const ctx = await verifyStorefrontCustomerSessionToken(raw);
  if (!ctx) return null;
  if (expectedWebsiteId != null && ctx.websiteId !== expectedWebsiteId) return null;
  return ctx;
}
