/**
 * Theme customizer flags for how featured POS products appear on Concept homepage HTML.
 * Stored in ThemeVersion.metadata.customizerContent.featuredProducts.
 */

export type FeaturedProductsCustomizerState = {
  /** When false, hides the large `.featured-product` Shopify section via injected CSS. Default true. */
  showSpotlightSection?: boolean;
  /** When true, homepage flavor grid lists `storefrontFeatured` products first. */
  prioritizeFeaturedInHomeGrid?: boolean;
};

export function normalizeFeaturedProductsCustomizerState(raw: unknown): FeaturedProductsCustomizerState {
  const defaults: FeaturedProductsCustomizerState = {
    showSpotlightSection: true,
    prioritizeFeaturedInHomeGrid: false,
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const o = raw as Record<string, unknown>;
  return {
    showSpotlightSection:
      typeof o.showSpotlightSection === "boolean" ? o.showSpotlightSection : defaults.showSpotlightSection,
    prioritizeFeaturedInHomeGrid:
      typeof o.prioritizeFeaturedInHomeGrid === "boolean"
        ? o.prioritizeFeaturedInHomeGrid
        : defaults.prioritizeFeaturedInHomeGrid,
  };
}

/** Remove prior injected tag, then optionally hide the featured-product spotlight section. */
export function applyFeaturedProductsSettingsToHtml(html: string, featured: FeaturedProductsCustomizerState | undefined): string {
  let out = html.replace(/<style[^>]*data-pf-customizer="featured-products"[^>]*>[\s\S]*?<\/style>\s*/gi, "");
  const show = featured?.showSpotlightSection !== false;
  if (show) return out;

  const style =
    '<style data-pf-customizer="featured-products">.shopify-section:has(.featured-product){display:none!important}</style>';
  if (/<\/head>/i.test(out)) {
    return out.replace(/<\/head>/i, `${style}</head>`);
  }
  return `${style}${out}`;
}
