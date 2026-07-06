/** DOM id for mounting React cart/checkout (and similar) inside Liquid theme `MainContent`. */
export const PF_REACT_MAIN_SLOT_ID = "pf-react-main-slot";

export function htmlHasPfReactMainSlot(html: string): boolean {
  return (
    html.includes(`id="${PF_REACT_MAIN_SLOT_ID}"`) || html.includes(`id='${PF_REACT_MAIN_SLOT_ID}'`)
  );
}

/**
 * Replaces the inner HTML of `<main id="MainContent">` with a single mount point for React.
 * Uses the same structure as Concept / Shopify-exported storefront HTML.
 */
export function injectPfReactMainSlot(html: string): string {
  const slot = `<div id="${PF_REACT_MAIN_SLOT_ID}" class="pf-react-main-slot page-width w-full"></div>`;

  const withId = html.replace(
    /(<main\b[^>]*\bid\s*=\s*["']MainContent["'][^>]*>)[\s\S]*?(<\/main>)/i,
    `$1${slot}$2`,
  );
  if (withId !== html) return withId;

  return html.replace(
    /(<main\b[^>]*\bclass\s*=\s*["'][^"']*\bmain-content\b[^"']*["'][^>]*>)[\s\S]*?(<\/main>)/i,
    `$1${slot}$2`,
  );
}
