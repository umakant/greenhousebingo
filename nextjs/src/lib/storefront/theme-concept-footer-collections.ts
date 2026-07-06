import type { PublicStorefrontCollectionListRow } from "@/lib/storefront/public-catalog";

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/**
 * Replaces the Concept theme footer “Collections” demo links (Headphones / Earphones / …) with
 * published storefront collection links. Matches the OS2 footer accordion markup from the
 * static `index.html` export; if the demo block is absent, returns `html` unchanged.
 */
export function applyFooterStorefrontCollectionsToHtml(
  html: string,
  collections: PublicStorefrontCollectionListRow[],
  options?: { collectionPathPrefix?: string },
): string {
  if (!html || collections.length === 0) return html;
  const prefix = (options?.collectionPathPrefix ?? "/shop/collections").replace(/\/$/, "");
  /** First “Collections” in the document is usually the drawer / mega nav; start after the footer root. */
  const footStart = html.indexOf('aria-label="Footer"');
  if (footStart === -1) return html;
  const marker = ">Collections</span>";
  const rel = html.indexOf(marker, footStart);
  if (rel === -1) return html;
  const m = rel;

  const ulOpen = '<ul class="flex flex-col gap-3">';
  const ulStart = html.indexOf(ulOpen, m);
  if (ulStart === -1) return html;

  /** Avoid clobbering a customized footer that no longer uses the demo catalog. */
  const demoClose = ulStart + 800;
  const slice = html.slice(ulStart, demoClose);
  if (!slice.includes("Headphones") || !slice.includes("Accessories")) return html;

  const ulEnd = html.indexOf("</ul>", ulStart);
  if (ulEnd === -1) return html;

  const inner = collections
    .slice(0, 24)
    .map((c) => {
      const slug = encodeURIComponent(c.slug.trim().toLowerCase());
      const title = escapeHtmlAttr(c.title.trim());
      return `<li class="inline-flex"><a href="${prefix}/${slug}" class="block reversed-link text-sm-lg leading-tight">${title}</a></li>`;
    })
    .join("");

  return `${html.slice(0, ulStart)}${ulOpen}${inner}</ul>${html.slice(ulEnd + 5)}`;
}
