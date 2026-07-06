import type { CSSProperties, ReactNode } from "react";

import type { PublicBundleCatalogProduct } from "@/lib/storefront/bundle-catalog";

import { LiquidReactMainPortal } from "./liquid-react-main-portal";
import { StorefrontLiquidHtmlView } from "./storefront-liquid-html-view";

type Props = {
  html: string;
  style?: CSSProperties;
  storefrontCurrency?: string;
  customizerIntroPreviewBridgeParentOrigin?: string | null;
  bundleCatalogProducts?: PublicBundleCatalogProduct[];
  children: ReactNode;
};

/**
 * Full Liquid theme document plus React UI mounted into the theme’s main content slot
 * (cart, checkout, etc.).
 */
export function StorefrontLiquidReactChrome({
  html,
  children,
  ...rest
}: Props) {
  return (
    <>
      <StorefrontLiquidHtmlView html={html} {...rest} />
      <LiquidReactMainPortal>{children}</LiquidReactMainPortal>
    </>
  );
}
