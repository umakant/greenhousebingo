import { cache } from "react";

import { getActiveShopifyLiquidTheme } from "@/lib/storefront/liquid/active-shopify-liquid-theme";
import { getStorefrontThemeCssVars, getStorefrontThemeCustomizerContent } from "@/lib/storefront/public-shop-page";
import { findDomainByHostname } from "@/lib/storefront/services/domain-service";
import { getSettingsForOwner } from "@/lib/settings-service";

/** Per-request memoization: `generateMetadata` and the page run overlapping DB work. */
export const shopRouteFindDomainByHostname = cache(findDomainByHostname);

export const shopRouteGetSettingsForOwner = cache(getSettingsForOwner);

export const shopRouteGetStorefrontThemeCssVars = cache(getStorefrontThemeCssVars);

export const shopRouteGetStorefrontThemeCustomizerContent = cache(getStorefrontThemeCustomizerContent);

export const shopRouteGetActiveShopifyLiquidTheme = cache(getActiveShopifyLiquidTheme);
