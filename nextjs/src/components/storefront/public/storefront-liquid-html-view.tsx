import type { CSSProperties } from "react";

import type { PublicBundleCatalogProduct } from "@/lib/storefront/bundle-catalog";
import type { ParsedHeadLink } from "@/lib/storefront/liquid/split-shopify-liquid-document";
import {
  parseHeadLinkTags,
  parseHeadStyleBlocks,
  shopifyLiquidHtmlFingerprint,
  splitShopifyLiquidDocument,
  stripHeadTagsFromMarkup,
} from "@/lib/storefront/liquid/split-shopify-liquid-document";
import { StorefrontCustomizerIntroPreviewBridge } from "./storefront-customizer-intro-preview-bridge";
import { StorefrontCustomizerPreviewFrameBridge } from "./storefront-customizer-preview-frame-bridge";
import { StorefrontBundleGridHydration } from "./storefront-bundle-grid-hydration";
import { StorefrontLiquidCartSync } from "./storefront-liquid-cart-sync";
import { StorefrontFooterCollectionsHydration } from "./storefront-footer-collections-hydration";
import { StorefrontShopMegaMenuHydration } from "./storefront-shop-mega-menu-hydration";
import { StorefrontCollectionsMegaMenuHydration } from "./storefront-collections-mega-menu-hydration";
import { StorefrontAccountNavHydration } from "./storefront-account-nav-hydration";
import { StorefrontLiquidDownloadSanitizer } from "./storefront-liquid-download-sanitizer";
import { StorefrontLiquidScriptActivator } from "./storefront-liquid-script-activator";
import { StorefrontLiquidSliderDotsCompat } from "./storefront-liquid-slider-dots-compat";
import { StorefrontImageComparisonScrollAnimation } from "./storefront-image-comparison-scroll-animation";

const LIQUID_HEAD_REMAINDER_CLASS = "pf-shopify-liquid-head-remainder";
const LIQUID_HEAD_REMAINDER_SELECTOR = `.${LIQUID_HEAD_REMAINDER_CLASS}`;

/** Minimal globals many ThemeForest / Shopify scripts touch off-platform. */
function shopifyLiquidPlatformStubScript(currency: string): string {
  const c = JSON.stringify(currency);
  return `(function(){var cur=${c};window.Shopify=window.Shopify||{};window.Shopify.routes=window.Shopify.routes||{root_url:"/"};window.Shopify.currency=window.Shopify.currency||{active:cur,rate:"1.0"};window.Shopify.locale=window.Shopify.locale||"en";window.Currency=window.Currency||{convertAll:function(){},formatMoney:function(n){return String(n);},cookie:{write:function(){},read:function(){return null;},clear:function(){}}};})();`;
}

function ThemeHeadLink({
  link,
  fetchPriority,
}: {
  link: ParsedHeadLink;
  fetchPriority?: "high" | "low" | "auto";
}) {
  return (
    <link
      rel={link.rel}
      href={link.href}
      {...(link.media ? { media: link.media } : {})}
      {...(link.crossOrigin ? { crossOrigin: link.crossOrigin } : {})}
      {...(fetchPriority ? { fetchPriority } : {})}
    />
  );
}

/**
 * Renders server-generated HTML from a Shopify-compatible Liquid theme.
 * Full-document Liquid must not be nested inside one div. We split `<head>` vs `<body>`, then
 * promote stylesheets / resource hints / icons as real `<link>` nodes (HTML5 allows these in
 * `body`); hidden `sr-only` sinks often prevent browsers from fetching theme CSS reliably.
 */
export function StorefrontLiquidHtmlView({
  html,
  style,
  storefrontCurrency = "USD",
  customizerIntroPreviewBridgeParentOrigin,
  bundleCatalogProducts,
}: {
  html: string;
  style?: CSSProperties;
  /** Used for `Currency` / `Shopify.currency` stubs. */
  storefrontCurrency?: string;
  /**
   * Set when `/shop?pf_preview=…` loads inside the theme customizer iframe.
   * String = only accept `postMessage` from that origin; `null` = same origin as storefront only.
   */
  customizerIntroPreviewBridgeParentOrigin?: string | null;
  /** Server-resolved bundle grid payload so the client hydrator does not depend on a second fetch. */
  bundleCatalogProducts?: PublicBundleCatalogProduct[];
}) {
  const { headInner, bodyInner } = splitShopifyLiquidDocument(html);
  const rootSelector = ".shopify-liquid-root";
  const fingerprint = shopifyLiquidHtmlFingerprint(html);

  const parsedLinks = parseHeadLinkTags(headInner);
  const styleBlocks = parseHeadStyleBlocks(headInner);
  const stripTags = [...parsedLinks.map((l) => l.fullTag), ...styleBlocks.map((s) => s.fullTag)];
  const headRemainder = headInner ? stripHeadTagsFromMarkup(headInner, stripTags) : "";

  const hints = parsedLinks.filter((l) => l.rel === "preconnect" || l.rel === "dns-prefetch");
  const hintDedup = [...new Map(hints.map((l) => [`${l.rel}|${l.href}`, l])).values()];

  const sheets = parsedLinks.filter((l) => l.rel === "stylesheet");
  const sheetDedup = [...new Map(sheets.map((l) => [l.href, l])).values()];

  const otherLinks = parsedLinks.filter(
    (l) => l.rel !== "stylesheet" && l.rel !== "preconnect" && l.rel !== "dns-prefetch",
  );

  return (
    <div suppressHydrationWarning className="pf-shopify-liquid-storefront">
      {customizerIntroPreviewBridgeParentOrigin !== undefined ? (
        <>
          <StorefrontCustomizerPreviewFrameBridge allowedParentOrigin={customizerIntroPreviewBridgeParentOrigin} />
          <StorefrontCustomizerIntroPreviewBridge allowedParentOrigin={customizerIntroPreviewBridgeParentOrigin} />
        </>
      ) : null}
      <script dangerouslySetInnerHTML={{ __html: shopifyLiquidPlatformStubScript(storefrontCurrency) }} />
      {bundleCatalogProducts && bundleCatalogProducts.length > 0 ? (
        <script
          id="pf-bundle-catalog-initial"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(bundleCatalogProducts).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      {hintDedup.map((l, i) => (
        <ThemeHeadLink key={`hint-${l.rel}-${l.href}-${i}`} link={l} />
      ))}
      {sheetDedup.slice(0, 2).map((l, i) => (
        <link key={`preload-css-${l.href}-${i}`} rel="preload" href={l.href} as="style" fetchPriority={i === 0 ? "high" : "auto"} />
      ))}
      {sheetDedup.map((l, i) => (
        <ThemeHeadLink key={`css-${l.href}-${i}`} link={l} fetchPriority={i === 0 ? "high" : undefined} />
      ))}
      {styleBlocks.map((b, i) => (
        <style key={`theme-style-${i}`} dangerouslySetInnerHTML={{ __html: b.css }} />
      ))}
      {otherLinks.map((l, i) => (
        <ThemeHeadLink key={`extra-${l.rel}-${l.href}-${i}`} link={l} />
      ))}
      {headRemainder ? (
        <div
          className={`${LIQUID_HEAD_REMAINDER_CLASS} sr-only`}
          aria-hidden
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: headRemainder }}
        />
      ) : null}
      <div
        className="shopify-liquid-root min-h-screen"
        style={style}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: bodyInner }}
      />
      <StorefrontLiquidScriptActivator
        headRemainderSelector={LIQUID_HEAD_REMAINDER_SELECTOR}
        rootSelector={rootSelector}
        fingerprint={fingerprint}
      />
      <StorefrontBundleGridHydration />
      <StorefrontFooterCollectionsHydration />
      <StorefrontShopMegaMenuHydration />
      <StorefrontCollectionsMegaMenuHydration />
      <StorefrontAccountNavHydration />
      <StorefrontLiquidCartSync />
      <StorefrontLiquidSliderDotsCompat rootSelector={rootSelector} />
      <StorefrontImageComparisonScrollAnimation rootSelector={rootSelector} />
      <StorefrontLiquidDownloadSanitizer bodySelector={rootSelector} headHostSelector={LIQUID_HEAD_REMAINDER_SELECTOR} />
    </div>
  );
}
