/**
 * Replace the Concept homepage “featured-collections” (`Best Sellers`) block with live collection tabs + products.
 */

import type { ConceptFeaturedTabsCollection } from "@/lib/storefront/public-catalog";
import { renderConceptFlavorCardsFromProducts } from "@/lib/storefront/theme-concept-home-catalog";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Index past `<div>` open tag starting at `openBracket`, or -1. */
function findMatchingDivClose(html: string, openBracket: number): number {
  let depth = 0;
  let i = openBracket;
  while (i < html.length) {
    if (html[i] !== "<") {
      i++;
      continue;
    }
    if (/^<div\b/i.test(html.slice(i))) {
      depth++;
      const gt = html.indexOf(">", i);
      if (gt === -1) return -1;
      i = gt + 1;
      continue;
    }
    if (/^<\/div>/i.test(html.slice(i))) {
      depth--;
      i += 6;
      if (depth === 0) return i;
      continue;
    }
    i++;
  }
  return -1;
}

function findFeaturedCollectionsSectionBounds(html: string): { start: number; end: number } | null {
  const re =
    /<div\b[^>]*\bclass="[^"]*\bshopify-section\b[^"]*\bfeatured-collections\b[^"]*"[^>]*>/i;
  const m = re.exec(html);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  const end = findMatchingDivClose(html, start);
  if (end === -1) return null;
  return { start, end };
}

function extractOpenTagAndStyle(sectionHtml: string): { openTag: string; styleBlock: string } {
  const gt = sectionHtml.indexOf(">");
  if (gt === -1) return { openTag: "", styleBlock: "" };
  const openTag = sectionHtml.slice(0, gt + 1);
  const after = sectionHtml.slice(gt + 1);
  const sm = after.match(/^\s*(<style>[\s\S]*?<\/style>)/i);
  const styleBlock = sm?.[1]?.trim() ?? "";
  return { openTag, styleBlock };
}

const CHEVRON_PREV = `<svg class="icon icon-chevron-left icon-md transform" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M14 6L8 12L14 18"></path>
    </svg>`;

const CHEVRON_NEXT = `<svg class="icon icon-chevron-right icon-md transform" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10 6L16 12L10 18"></path>
    </svg>`;

function tabIds(index: number): { panel: string; panelContent: string; slider: string } {
  const n = String(index);
  return {
    panel: `TabPanel-pfd-fc-${n}`,
    panelContent: `TabPanelContent-pfd-fc-${n}`,
    slider: `Slider-pfd-fc-${n}`,
  };
}

function renderTabsAndPanels(
  collections: ConceptFeaturedTabsCollection[],
  productBase: string,
  sectionTitle: string,
): string {
  const tabButtons = collections
    .map((c, i) => {
      const { panel } = tabIds(i);
      const isFirst = i === 0;
      const btnClass = isFirst
        ? "tab__item button button--primary whitespace-nowrap"
        : "tab__item button button--secondary whitespace-nowrap";
      const disabled = isFirst ? ` disabled=""` : "";
      return `<button class="${btnClass}"${disabled} type="button" is="hover-button" role="tab" aria-controls="${panel}" data-index="${i}"><span class="btn-fill" data-fill=""></span>
                  <span class="btn-text">${escapeHtml(c.title)}</span>
                <span class="btn-loader">
        <span></span>
        <span></span>
        <span></span>
      </span></button>`;
    })
    .join("");

  const indicators = collections
    .map((_, i) => {
      const { slider } = tabIds(i);
      const hidden = i === 0 ? "" : ` hidden=""`;
      const prevDisabled = i === 0 ? ` disabled=""` : "";
      return `<div class="indicators hidden lg:flex gap-2d5"${hidden} data-index="${i}">
              <button class="button button--secondary" type="button" is="previous-button" aria-controls="${slider}" aria-label="Previous"${prevDisabled}>
                <span class="btn-fill" data-fill=""></span>
                <span class="btn-text">${CHEVRON_PREV}</span>
              <span class="btn-loader">
        <span></span>
        <span></span>
        <span></span>
      </span></button>
              <button class="button button--secondary" type="button" is="next-button" aria-controls="${slider}" aria-label="Next">
                <span class="btn-fill" data-fill=""></span>
                <span class="btn-text">${CHEVRON_NEXT}</span>
              <span class="btn-loader">
        <span></span>
        <span></span>
        <span></span>
      </span></button>
            </div>`;
    })
    .join("");

  const panels = collections
    .map((c, i) => {
      const { panel, panelContent, slider } = tabIds(i);
      const hiddenAttr = i > 0 ? ` hidden=""` : "";
      const cardsInner = c.products.length
        ? renderConceptFlavorCardsFromProducts(c.products, { productPathPrefix: productBase })
        : `<div class="card media-card media-card--card col-span-full" style="--motion-translateY: 0px;"><div class="media-card__content flex w-full p-6"><p class="text-sm opacity-80">No products in this collection yet.</p></div></div>`;
      return `<div id="${panel}" role="tabpanel"${hiddenAttr}>
          <div id="${panelContent}"><slider-element id="${slider}" class="grid slider slider--desktop slider--tablet" selector=".card-grid>.card" tabindex="0">
                <motion-list class="product-grid card-grid card-grid--4 mobile:card-grid--1 grid" initialized="">${cardsInner}</motion-list>
              </slider-element></div>
        </div>`;
    })
    .join("");

  return `<div class="page-width relative"><div class="title-wrapper leading-none gap-4 lg:gap-8 flex flex-col text-left md:items-end md:flex-row md:justify-between relative z-1"><div class="grid gap-4"><h2 class="heading title-md">${escapeHtml(
    sectionTitle,
  )}</h2></div></div><tabs-element class="tab-list flex gap-6 justify-between" selected-index="0">
        <scroll-shadow class="scroll-shadow grid overflow-hidden"><template shadowrootmode="open">
            <slot></slot>
            <s dir="ltr" style="--t: 0; --b: 0; --l: 0; --r: 0;">
              <span class="l"></span>
              <span class="r"></span>
            </s>
            <style>
              :host{display:inline-block;position:relative}:host([hidden]){display:none}
              s{position:absolute;inset:0;pointer-events:none;--color-background:var(--color-placeholder)}
              s span{position:absolute;inset-block:0;width:var(--sp-12);opacity:0;transition:opacity var(--animation-short);}
              s .l{inset-inline-start:0;opacity:var(--l);background:linear-gradient(90deg,rgb(var(--color-background)) 0%,transparent 100%);}
              s .r{inset-inline-end:0;opacity:var(--r);background:linear-gradient(270deg,rgb(var(--color-background)) 0%,transparent 100%);}
              s[dir=rtl] :is(.icon-chevron-left,.icon-chevron-right){transform:scaleX(-1);}
            </style>
          </template>
          <div class="scroll-area grid">
            <div class="flex gap-4" role="tablist">${tabButtons}</div>
          </div>
          <template></template>
        </scroll-shadow>${indicators}</tabs-element>${panels}</div>`;
}

/**
 * Replaces the static `shopify-section.featured-collections` block with catalog-driven tabs when `collections` is non-empty.
 */
export function applyFeaturedCollectionsTabsToHtml(
  html: string,
  collections: ConceptFeaturedTabsCollection[],
  options?: { productPathPrefix?: string; sectionTitle?: string },
): string {
  if (!collections.length) return html;
  const bounds = findFeaturedCollectionsSectionBounds(html);
  if (!bounds) return html;

  const sectionHtml = html.slice(bounds.start, bounds.end);
  const { openTag, styleBlock } = extractOpenTagAndStyle(sectionHtml);
  if (!openTag) return html;

  const productBase = options?.productPathPrefix ?? "/shop/products";
  const sectionTitle = options?.sectionTitle?.trim() || "Best Sellers";
  const inner = renderTabsAndPanels(collections, productBase, sectionTitle);

  const replacement = `${openTag}${styleBlock ? `${styleBlock}` : ""}<div class="section section--padding section--rounded relative">
  ${inner}
</div></div>`;

  return html.slice(0, bounds.start) + replacement + html.slice(bounds.end);
}
