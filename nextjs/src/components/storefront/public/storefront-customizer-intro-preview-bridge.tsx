"use client";

import { useEffect } from "react";

import { applyBeforeAfterSectionToHtml } from "@/lib/storefront/theme-customizer-before-after";
import type { BeforeAfterSectionState } from "@/lib/storefront/theme-customizer-before-after";
import { applyFooterCustomizerToHtml, normalizeFooterCustomizerState } from "@/lib/storefront/theme-customizer-footer";
import { applyHeroSliderToHtml } from "@/lib/storefront/theme-customizer-hero-slider";
import { applyIntroSectionToHtml } from "@/lib/storefront/theme-customizer-intro-section";
import type { IntroSectionState } from "@/lib/storefront/theme-customizer-intro-section";
import { applyMarqueeTextToHtml } from "@/lib/storefront/theme-customizer-marquee-text";
import type { MarqueeTextCustomizerState } from "@/lib/storefront/theme-customizer-marquee-text";
import {
  applyTrustIconsSectionToHtml,
  normalizeTrustIconsSectionState,
} from "@/lib/storefront/theme-customizer-trust-icons";
import type { TrustIconsSectionState } from "@/lib/storefront/theme-customizer-trust-icons";
import {
  applyBundleSectionToHtml,
  type BundleSectionState,
} from "@/lib/storefront/theme-customizer-bundle-section";
import {
  applyTopHeaderToHtml,
  type TopHeaderCustomizerState,
} from "@/lib/storefront/theme-customizer-top-header";
import {
  applySocialLinksToHtml,
  type SocialLinksCustomizerState,
} from "@/lib/storefront/theme-customizer-social-links";
import type { HeroSliderSlideRow } from "@/lib/storefront/theme-customizer-content";
import { reportCustomizerPreviewFrameHeight } from "./storefront-customizer-preview-frame-bridge";

/**
 * Subset of {@link applyThemeCustomizerContentToHtml}: hero → before/after → marquee → trust icons → footer → intro last.
 */
const MSG_TYPE = "PF_STOREFRONT_CUSTOMIZER_LIVE_PREVIEW";

export type StorefrontCustomizerLivePreviewPayload = {
  type: typeof MSG_TYPE;
  /** Theme version id for rewriting `./assets/…` hero images to `/shop/theme-assets/{id}/…`. */
  themeAssetRouteId?: string;
  heroSlider?: { slides?: HeroSliderSlideRow[] };
  beforeAfterSection?: BeforeAfterSectionState;
  trustIconsSection?: TrustIconsSectionState;
  footerSection?: unknown;
  introSection?: IntroSectionState;
  marqueeText?: MarqueeTextCustomizerState;
  bundleSection?: BundleSectionState;
  topHeader?: TopHeaderCustomizerState;
  socialLinks?: SocialLinksCustomizerState;
};

/**
 * Theme customizer iframe loads `/shop?pf_preview=…`. Server HTML reflects last publish only.
 * Parent posts draft {@link StorefrontCustomizerLivePreviewPayload} so sidebar edits match the iframe
 * without publishing every keystroke. Image/text find-replace rows still require Publish.
 */
export function StorefrontCustomizerIntroPreviewBridge({
  allowedParentOrigin,
}: {
  /** When set (from `pf_msg_parent` query), only accept messages from that origin (cross-subdomain admin). */
  allowedParentOrigin: string | null;
}) {
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const allowed =
        (allowedParentOrigin?.trim() && allowedParentOrigin.trim()) ||
        window.location.origin;
      if (ev.origin !== allowed) return;
      const d = ev.data as StorefrontCustomizerLivePreviewPayload | null;
      if (!d || d.type !== MSG_TYPE) return;
      const root = document.querySelector(".shopify-liquid-root");
      if (!root) return;
      let html = root.innerHTML;
      html = applyHeroSliderToHtml(html, d.heroSlider?.slides, d.themeAssetRouteId);
      html = applyBeforeAfterSectionToHtml(html, d.beforeAfterSection);
      html = applyMarqueeTextToHtml(html, d.marqueeText);
      html = applyTrustIconsSectionToHtml(html, normalizeTrustIconsSectionState(d.trustIconsSection));
      html = applyFooterCustomizerToHtml(html, normalizeFooterCustomizerState(d.footerSection));
      html = applyBundleSectionToHtml(html, d.bundleSection);
      html = applyTopHeaderToHtml(html, d.topHeader);
      html = applySocialLinksToHtml(html, d.socialLinks);
      html = applyIntroSectionToHtml(html, d.introSection);
      root.innerHTML = html;
      reportCustomizerPreviewFrameHeight(allowed);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allowedParentOrigin]);

  return null;
}

export const STOREFRONT_CUSTOMIZER_LIVE_PREVIEW_MESSAGE_TYPE = MSG_TYPE;
/** @deprecated Use STOREFRONT_CUSTOMIZER_LIVE_PREVIEW_MESSAGE_TYPE */
export const STOREFRONT_INTRO_PREVIEW_MESSAGE_TYPE = MSG_TYPE;
