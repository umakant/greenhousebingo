import type { PublicStorefrontCollectionListRow } from "@/lib/storefront/public-catalog";

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const ARROW_SVG = `<svg class="icon icon-arrow-right icon-sm transform" viewBox="0 0 21 20" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 10H18M18 10L12.1667 4.16675M18 10L12.1667 15.8334"></path>
    </svg>`;

function renderEmptyCartCollectionLi(c: PublicStorefrontCollectionListRow, base: string): string {
  const slug = encodeURIComponent(c.slug.trim().toLowerCase());
  const href = escapeHtmlAttr(`${base}/${slug}`);
  const title = escapeHtmlAttr(c.title.trim());
  const imgUrl = c.featuredImageUrl?.trim();
  const thumb = imgUrl
    ? `<img src="${escapeHtmlAttr(imgUrl)}" alt="" width="35" height="35" loading="lazy" sizes="36px" class="rounded object-cover shrink-0" />`
    : `<span class="inline-block h-9 w-9 shrink-0 rounded-md bg-current/10" aria-hidden="true"></span>`;
  return `<li>
                          <a class="flex items-center justify-between gap-3" href="${href}" data-pf-shop-collection="1">
                            <span class="flex min-w-0 items-center gap-3">${thumb}<span class="truncate font-medium text-left">${title}</span></span>${ARROW_SVG}</a>
                        </li>`;
}

/**
 * Replaces the Concept cart drawer “Headphones / Earphones / …” empty-state links with published
 * `/shop/collections/{slug}` rows. Idempotent via `data-pf-empty-cart-collections` on the `<ul>`.
 */
export function applyCartDrawerEmptyCollectionsToHtml(
  html: string,
  collections: PublicStorefrontCollectionListRow[],
  options?: { collectionPathPrefix?: string },
): string {
  if (!html || collections.length === 0) return html;
  if (!html.includes("drawer__empty-collections")) return html;
  if (html.includes('data-pf-empty-cart-collections="1"')) return html;

  const prefix = (options?.collectionPathPrefix ?? "/shop/collections").replace(/\/$/, "");
  const ulOpenRe = /<ul(\s[^>]*\bclass="[^"]*\bdrawer__empty-collections\b[^"]*"[^>]*)>/i;
  const m = ulOpenRe.exec(html);
  if (!m) return html;

  const openTagEnd = m.index + m[0].length;
  const closeIdx = html.indexOf("</ul>", openTagEnd);
  if (closeIdx === -1) return html;

  const inner = collections.slice(0, 12).map((c) => renderEmptyCartCollectionLi(c, prefix)).join("");
  const newOpenTag = `<ul${m[1]} data-pf-empty-cart-collections="1">`;
  return `${html.slice(0, m.index)}${newOpenTag}${inner}</ul>${html.slice(closeIdx + 5)}`;
}
