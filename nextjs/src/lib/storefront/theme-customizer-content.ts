/**
 * Merchant-editable homepage HTML tweaks for static Concept exports and Liquid HTML output.
 * Stored on `ThemeVersion.metadata.customizerContent`.
 */

import { applyHeroSliderToHtml } from "@/lib/storefront/theme-customizer-hero-slider";
import {
  applyFeaturedProductsSettingsToHtml,
  normalizeFeaturedProductsCustomizerState,
  type FeaturedProductsCustomizerState,
} from "@/lib/storefront/theme-customizer-featured-products";
import { applyIntroSectionToHtml, type IntroSectionState } from "@/lib/storefront/theme-customizer-intro-section";
import {
  applyBeforeAfterSectionToHtml,
  normalizeBeforeAfterSectionState,
  type BeforeAfterSectionState,
} from "@/lib/storefront/theme-customizer-before-after";
import {
  applyMarqueeTextToHtml,
  normalizeMarqueeTextState,
  type MarqueeTextCustomizerState,
} from "@/lib/storefront/theme-customizer-marquee-text";
import {
  applyFooterCustomizerToHtml,
  normalizeFooterCustomizerState,
  type FooterCustomizerState,
} from "@/lib/storefront/theme-customizer-footer";
import {
  applyTrustIconsSectionToHtml,
  normalizeTrustIconsSectionState,
  type TrustIconsSectionState,
} from "@/lib/storefront/theme-customizer-trust-icons";
import {
  applyBundleSectionToHtml,
  normalizeBundleSectionState,
  type BundleSectionState,
} from "@/lib/storefront/theme-customizer-bundle-section";
import {
  applyTopHeaderToHtml,
  normalizeTopHeaderState,
  type TopHeaderCustomizerState,
} from "@/lib/storefront/theme-customizer-top-header";
import {
  applySocialLinksToHtml,
  normalizeSocialLinksState,
  type SocialLinksCustomizerState,
} from "@/lib/storefront/theme-customizer-social-links";

export type { IntroSectionState } from "@/lib/storefront/theme-customizer-intro-section";
export type { FeaturedProductsCustomizerState } from "@/lib/storefront/theme-customizer-featured-products";
export type { BeforeAfterSectionState } from "@/lib/storefront/theme-customizer-before-after";
export type { MarqueeTextCustomizerState } from "@/lib/storefront/theme-customizer-marquee-text";
export type { FooterCustomizerState } from "@/lib/storefront/theme-customizer-footer";
export type { TrustIconsSectionState } from "@/lib/storefront/theme-customizer-trust-icons";
export type { BundleSectionState } from "@/lib/storefront/theme-customizer-bundle-section";
export type { TopHeaderCustomizerState } from "@/lib/storefront/theme-customizer-top-header";
export type { SocialLinksCustomizerState } from "@/lib/storefront/theme-customizer-social-links";

export type ThemeCustomizerImageRow = {
  id: string;
  label?: string;
  /** Substring exactly as it appears in served HTML (img src, CSS url(), etc.). */
  sourceUrl: string;
  replacementUrl: string;
};

export type ThemeCustomizerTextRow = {
  id: string;
  label?: string;
  find: string;
  replace: string;
};

/** Structured hero slideshow (Concept `slideshow-element` + `slideshow-words`). */
export type HeroSliderSlideRow = {
  id: string;
  /** Matches `data-index` on `.slideshow-word` (0-based). */
  sortIndex: number;
  imageUrl: string;
  heading: string;
  buttonText: string;
  buttonHref: string;
};

export type ThemeCustomizerContentState = {
  images?: ThemeCustomizerImageRow[];
  texts?: ThemeCustomizerTextRow[];
  heroSlider?: { slides?: HeroSliderSlideRow[] };
  /** Homepage intro / “About” collage block (Concept `collage-small with-richtext`). */
  introSection?: IntroSectionState;
  /** Featured POS products on Concept homepage (spotlight section + grid ordering). */
  featuredProducts?: FeaturedProductsCustomizerState;
  /** Image comparison “Before & after” block (`<image-comparison>`). */
  beforeAfterSection?: BeforeAfterSectionState;
  /** Large outline scrolling headline (`marquee-element` + stencil text). */
  marqueeText?: MarqueeTextCustomizerState;
  /** Footer columns, newsletter, socials, copyright bar (Concept `footer-group`). */
  footerSection?: FooterCustomizerState;
  /** Icon + copy row directly above the main footer (`carousel-element.text-with-icons`). */
  trustIconsSection?: TrustIconsSectionState;
  /** Heading + intro copy above the homepage bundle product grid. */
  bundleSection?: BundleSectionState;
  /** Top "announcement bar" — show/hide toggle + rotating message slides. */
  topHeader?: TopHeaderCustomizerState;
  /**
   * Single source of truth for social-media URLs (Facebook / X / Instagram / YouTube). Applied
   * LAST in the rewrite pipeline so it overrides any per-section social fields (top header /
   * footer / floating sidebar) when the merchant publishes URLs here.
   */
  socialLinks?: SocialLinksCustomizerState;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function normalizeThemeCustomizerContentState(raw: unknown): ThemeCustomizerContentState {
  const emptyIntro: IntroSectionState = {
    heading: "",
    headingHighlightWord: "",
    buttonText: "",
    buttonHref: "",
    bodyHtml: "",
  };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      images: [],
      texts: [],
      heroSlider: { slides: [] },
      introSection: emptyIntro,
      featuredProducts: normalizeFeaturedProductsCustomizerState(undefined),
      beforeAfterSection: normalizeBeforeAfterSectionState(undefined),
      marqueeText: normalizeMarqueeTextState(undefined),
      footerSection: normalizeFooterCustomizerState(undefined),
      trustIconsSection: normalizeTrustIconsSectionState(undefined),
      bundleSection: normalizeBundleSectionState(undefined),
      topHeader: normalizeTopHeaderState(undefined),
      socialLinks: normalizeSocialLinksState(undefined),
    };
  }
  const o = raw as Record<string, unknown>;
  const imagesRaw = Array.isArray(o.images) ? o.images : [];
  const textsRaw = Array.isArray(o.texts) ? o.texts : [];

  const images: ThemeCustomizerImageRow[] = [];
  for (const row of imagesRaw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
    const sourceUrl = typeof r.sourceUrl === "string" ? r.sourceUrl : "";
    const replacementUrl = typeof r.replacementUrl === "string" ? r.replacementUrl : "";
    if (!id || !sourceUrl.trim()) continue;
    images.push({
      id,
      label: typeof r.label === "string" ? r.label : undefined,
      sourceUrl,
      replacementUrl,
    });
  }

  const texts: ThemeCustomizerTextRow[] = [];
  for (const row of textsRaw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
    const find = typeof r.find === "string" ? r.find : "";
    const replace = typeof r.replace === "string" ? r.replace : "";
    if (!id || !find) continue;
    texts.push({
      id,
      label: typeof r.label === "string" ? r.label : undefined,
      find,
      replace,
    });
  }

  const heroRaw = o.heroSlider;
  const slidesRaw =
    heroRaw && typeof heroRaw === "object" && !Array.isArray(heroRaw)
      ? ((heroRaw as Record<string, unknown>).slides as unknown)
      : undefined;
  const slidesList = Array.isArray(slidesRaw) ? slidesRaw : [];
  const heroSlides: HeroSliderSlideRow[] = [];
  for (const row of slidesList) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    let id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
    let sortIndex = typeof r.sortIndex === "number" ? r.sortIndex : parseInt(String(r.sortIndex ?? ""), 10);
    if (!Number.isFinite(sortIndex)) sortIndex = 0;
    /** Persisted JSON sometimes omits ids; without them we skipped slides and live /shop never applied headings/images. */
    if (!id) id = `pf-hero-${sortIndex}-${heroSlides.length}`;
    heroSlides.push({
      id,
      sortIndex,
      imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : "",
      heading: typeof r.heading === "string" ? r.heading : "",
      buttonText: typeof r.buttonText === "string" ? r.buttonText : "",
      buttonHref: typeof r.buttonHref === "string" ? r.buttonHref : "",
    });
  }

  const introRaw = o.introSection;
  let introSection: IntroSectionState = { ...emptyIntro };
  if (introRaw && typeof introRaw === "object" && !Array.isArray(introRaw)) {
    const ir = introRaw as Record<string, unknown>;
    introSection = {
      heading: typeof ir.heading === "string" ? ir.heading : "",
      headingHighlightWord: typeof ir.headingHighlightWord === "string" ? ir.headingHighlightWord : "",
      buttonText: typeof ir.buttonText === "string" ? ir.buttonText : "",
      buttonHref: typeof ir.buttonHref === "string" ? ir.buttonHref : "",
      bodyHtml: typeof ir.bodyHtml === "string" ? ir.bodyHtml : "",
    };
  }

  const featuredProducts = normalizeFeaturedProductsCustomizerState(o.featuredProducts);
  const beforeAfterSection = normalizeBeforeAfterSectionState(o.beforeAfterSection);
  const marqueeText = normalizeMarqueeTextState(o.marqueeText);
  const footerSection = normalizeFooterCustomizerState(o.footerSection);
  const trustIconsSection = normalizeTrustIconsSectionState(o.trustIconsSection);
  const bundleSection = normalizeBundleSectionState(o.bundleSection);
  const topHeader = normalizeTopHeaderState(o.topHeader);
  const socialLinks = normalizeSocialLinksState(o.socialLinks);

  return {
    images,
    texts,
    heroSlider: { slides: heroSlides },
    introSection,
    featuredProducts,
    beforeAfterSection,
    marqueeText,
    footerSection,
    trustIconsSection,
    bundleSection,
    topHeader,
    socialLinks,
  };
}

/** Collect likely image URLs from theme HTML for the customizer “scan” action. */
export function discoverImageUrlsInHtml(html: string): string[] {
  const found = new Set<string>();
  const add = (u: string) => {
    const t = u.trim().replace(/^["']|["']$/g, "");
    if (!t || t.startsWith("data:")) return;
    found.add(t);
  };

  let m: RegExpExecArray | null;
  const reImg = /\bsrc=["']([^"']+)["']/gi;
  while ((m = reImg.exec(html))) add(m[1]!);

  const reSrcset = /\bsrcset=["']([^"']+)["']/gi;
  while ((m = reSrcset.exec(html))) {
    for (const part of m[1]!.split(",")) {
      const first = part.trim().split(/\s+/)[0];
      if (first) add(first);
    }
  }

  const reUrl = /url\(\s*["']?([^"')\s]+)["']?\s*\)/gi;
  while ((m = reUrl.exec(html))) add(m[1]!);

  return [...found].sort((a, b) => a.localeCompare(b));
}

/**
 * Apply merchant replacements to served HTML. Longer `sourceUrl` / `find` runs first to reduce accidental partial swaps.
 */
export function applyThemeCustomizerContentToHtml(
  html: string,
  state: ThemeCustomizerContentState | null | undefined,
  options?: { themeAssetRouteId?: string },
): string {
  if (!state) return html;
  let out = html;

  const imageRows = [...(state.images ?? [])].filter(
    (r) => isNonEmptyString(r.sourceUrl) && r.sourceUrl.trim() !== (r.replacementUrl ?? "").trim(),
  );
  imageRows.sort((a, b) => b.sourceUrl.length - a.sourceUrl.length);
  for (const row of imageRows) {
    const from = row.sourceUrl;
    const to = row.replacementUrl ?? "";
    if (!from.trim()) continue;
    out = out.split(from).join(to);
  }

  const textRows = [...(state.texts ?? [])].filter(
    (r) => isNonEmptyString(r.find) && r.find !== (r.replace ?? ""),
  );
  textRows.sort((a, b) => b.find.length - a.find.length);
  for (const row of textRows) {
    out = out.split(row.find).join(row.replace ?? "");
  }

  out = applyHeroSliderToHtml(out, state.heroSlider?.slides, options?.themeAssetRouteId);

  out = applyBeforeAfterSectionToHtml(out, state.beforeAfterSection);

  out = applyFeaturedProductsSettingsToHtml(out, state.featuredProducts);

  out = applyMarqueeTextToHtml(out, state.marqueeText);

  out = applyTrustIconsSectionToHtml(out, state.trustIconsSection);

  out = applyFooterCustomizerToHtml(out, state.footerSection);

  out = applyBundleSectionToHtml(out, state.bundleSection);

  out = applyTopHeaderToHtml(out, state.topHeader);

  /**
   * Run social-links rewrite AFTER the per-section appliers so the central socialLinks state wins
   * over any URLs the merchant set inside Top header or Footer panels. Empty platform fields fall
   * through unchanged (per-section value or theme default `href="#"` is preserved).
   */
  out = applySocialLinksToHtml(out, state.socialLinks);

  /** Intro last so image/text find-replace rows and other sections cannot clobber heading/button/body. */
  out = applyIntroSectionToHtml(out, state.introSection);

  return out;
}
