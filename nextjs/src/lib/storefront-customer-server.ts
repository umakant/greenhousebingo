import { cookies } from "next/headers";

import { STOREFRONT_CUSTOMER_SESSION_COOKIE } from "@/lib/storefront-customer-constants";
import { verifyStorefrontCustomerSessionToken } from "@/lib/storefront-customer-session";

export async function getStorefrontCustomerSessionFromCookies() {
  const jar = await cookies();
  const raw = jar.get(STOREFRONT_CUSTOMER_SESSION_COOKIE)?.value;
  return verifyStorefrontCustomerSessionToken(raw);
}

/** Returns the session only when it belongs to the given website (path tenant). */
export async function getStorefrontCustomerSessionForWebsite(websiteId: string) {
  const ctx = await getStorefrontCustomerSessionFromCookies();
  if (!ctx) return null;
  if (ctx.websiteId.toString() !== websiteId) return null;
  return ctx;
}
