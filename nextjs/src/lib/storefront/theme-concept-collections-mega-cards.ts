/**
 * Replace the Concept header “Collections” mega-menu card row (`ul#…__header-2-start`) with
 * published storefront collection cards + an “All collections” tile.
 */

import type { PublicStorefrontCollectionListRow } from "@/lib/storefront/public-catalog";

const HEADER2_UL_OPEN_RE = /<ul id="HeaderNavMega[^"]*__header-2-start"[^>]*>/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, " ");
}

function plainExcerpt(raw: string | null | undefined, maxLen: number): string {
  if (!raw?.trim()) return "";
  const t = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}

function findUlOpenEnd(html: string, ulStart: number): number {
  return html.indexOf(">", ulStart);
}

function findMatchingUlCloseEnd(html: string, ulStart: number): number {
  const gt = html.indexOf(">", ulStart);
  if (gt === -1) return -1;
  let i = gt + 1;
  let depth = 1;
  while (i < html.length) {
    const a = html.indexOf("<ul", i);
    const b = html.indexOf("</ul>", i);
    if (b === -1) return -1;
    if (a !== -1 && a < b) {
      depth++;
      i = a + 3;
    } else {
      depth--;
      if (depth === 0) return b + 5;
      i = b + 5;
    }
  }
  return -1;
}

const CARD_ARROW = `<svg class="icon icon-arrow-right icon-xs transform shrink-0 hidden xl:block" viewBox="0 0 21 20" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 10H18M18 10L12.1667 4.16675M18 10L12.1667 15.8334"></path>
    </svg>`;

function renderCollectionCard(c: PublicStorefrontCollectionListRow, collectionPathPrefix: string): string {
  const base = collectionPathPrefix.replace(/\/$/, "");
  const href = `${base}/${encodeURIComponent(c.slug.trim().toLowerCase())}`;
  const img = escapeAttr((c.featuredImageUrl ?? "").trim() || "/favicon.ico");
  const title = escapeHtml(c.title.trim());
  const excerpt = plainExcerpt(c.description, 160) || "Shop this collection.";
  const desc = escapeHtml(excerpt);
  const aria = escapeAttr(c.title.trim());
  return `<li class="mega-menu__item flex opacity-0 w-full">
                <div class="media-card media-card--card">
                  <a class="media-card__link flex flex-col w-full h-full relative" href="${escapeAttr(href)}" aria-label="${aria}" style="--color-foreground: 23 23 23;--color-overlay: 255 255 255;--overlay-opacity: 0.0;"><div class="media media--square relative overflow-hidden"><img src="${img}" alt="" width="1200" height="1200" loading="lazy" is="lazy-image" class="loaded"></div><div class="media-card__content flex justify-between items-center gap-4 w-full">
                        <div class="media-card__text opacity-0 shrink-1 grid gap-0d5"><p>
                              <span class="heading reversed-link text-xl-3xl tracking-tighter leading-tight">${title}</span>
                            </p><p class="leading-none text-xs">${desc}</p></div>${CARD_ARROW}</div></a>
                </div>
              </li>`;
}

function renderAllCollectionsCard(collectionPathPrefix: string, heroImage: string | null): string {
  const base = collectionPathPrefix.replace(/\/$/, "");
  const href = `${base}/all`;
  const img = escapeAttr((heroImage ?? "").trim() || "/favicon.ico");
  return `<li class="mega-menu__item flex opacity-0 w-full">
                <div class="media-card media-card--card">
                  <a class="media-card__link flex flex-col w-full h-full relative" href="${escapeAttr(href)}" aria-label="All collections" style="--color-foreground: 255 255 255;--color-overlay: 0 0 0;--overlay-opacity: 0.4;"><div class="media media--square relative overflow-hidden"><img src="${img}" alt="" width="1200" height="1200" loading="lazy" is="lazy-image" class="loaded"></div><div class="media-card__content flex justify-between items-center gap-4 w-full">
                        <div class="media-card__text opacity-0 shrink-1 grid gap-0d5"><p>
                              <span class="heading reversed-link text-xl-3xl tracking-tighter leading-tight">All collections</span>
                            </p><p class="leading-none text-xs">Check out all our collections.</p></div>${CARD_ARROW}</div></a>
                </div>
              </li>`;
}

export type CollectionsMegaMenuCardsOptions = {
  collectionPathPrefix?: string;
  /** Collection tiles before the “All collections” card (theme shows four + CTA). */
  maxCollectionCards?: number;
};

/**
 * `<li>…</li>` sequence for `ul#HeaderNavMega-…__header-2-start` (no `<ul>` wrapper).
 */
export function buildCollectionsMegaMenuListInnerHtml(
  collections: PublicStorefrontCollectionListRow[],
  options?: CollectionsMegaMenuCardsOptions,
): string {
  if (!collections.length) return "";
  const prefix = options?.collectionPathPrefix ?? "/shop/collections";
  const maxN = Math.min(12, Math.max(1, options?.maxCollectionCards ?? 4));
  const slice = collections.slice(0, maxN);
  const heroForAll = slice[0]?.featuredImageUrl ?? collections[0]?.featuredImageUrl ?? null;
  const cards = slice.map((c) => renderCollectionCard(c, prefix)).join("");
  return `${cards}${renderAllCollectionsCard(prefix, heroForAll)}`;
}

/**
 * Injects published collection cards into the “Collections” nav mega-menu when the OS2 markup is present.
 */
export function applyCollectionsMegaMenuCardsToHtml(
  html: string,
  collections: PublicStorefrontCollectionListRow[],
  options?: CollectionsMegaMenuCardsOptions,
): string {
  if (!collections.length) return html;
  const m = HEADER2_UL_OPEN_RE.exec(html);
  if (!m || m.index === undefined) return html;
  const ulStart = m.index;
  const openEnd = findUlOpenEnd(html, ulStart);
  if (openEnd === -1) return html;
  const ulCloseEndEx = findMatchingUlCloseEnd(html, ulStart);
  if (ulCloseEndEx === -1) return html;
  const innerProbe = html.slice(openEnd + 1, ulCloseEndEx - 5);
  if (!innerProbe.includes("mega-menu__item") || !innerProbe.includes("media-card")) {
    return html;
  }

  let openTag = html.slice(ulStart, openEnd + 1);
  if (!/\bdata-pf-collections-mega\s*=/i.test(openTag)) {
    openTag = `${openTag.slice(0, -1)} data-pf-collections-mega="1">`;
  }
  const newInner = buildCollectionsMegaMenuListInnerHtml(collections, options);
  if (!newInner.trim()) return html;
  const closeAndRest = html.slice(ulCloseEndEx - 5);
  return `${html.slice(0, ulStart)}${openTag}${newInner}${closeAndRest}`;
}
