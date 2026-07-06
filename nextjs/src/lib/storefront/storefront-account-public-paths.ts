import { joinStorefrontPublicPath } from "@/lib/storefront/custom-domain-hosts";

/** Public storefront URL for My Account (`/account` or `/shop/account`). */
export function storefrontAccountDashboardPath(customDomain: boolean): string {
  return joinStorefrontPublicPath(customDomain, "account");
}

/** Public storefront URL for customer sign-in (`/account/login` or `/shop/account/login`). */
export function storefrontAccountLoginPath(customDomain: boolean): string {
  return joinStorefrontPublicPath(customDomain, "account/login");
}
