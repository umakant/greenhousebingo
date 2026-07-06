/**
 * Replace the first Concept homepage “flavor” slider (`motion-list.card-grid` with inventory badges)
 * with cards generated from live {@link PosProduct} rows.
 */

import type { ConceptHomeGridProduct } from "@/lib/storefront/public-catalog";

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

function plainExcerpt(raw: string | null, maxLen: number): string {
  if (!raw?.trim()) return "";
  const t = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}

const ARROW_SVG = `<svg class="icon icon-arrow-right icon-xs transform shrink-0" viewBox="0 0 21 20" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 10H18M18 10L12.1667 4.16675M18 10L12.1667 15.8334"></path>
    </svg>`;

export function renderConceptFlavorCardsFromProducts(
  products: ConceptHomeGridProduct[],
  options?: { productPathPrefix?: string },
): string {
  if (!products.length) return "";
  const base = options?.productPathPrefix ?? "/shop/products";
  return products.map((p, i) => renderConceptFlavorCard(p, base, i === 0)).join("");
}

function renderConceptFlavorCard(p: ConceptHomeGridProduct, productBase: string, first: boolean): string {
  const slugEnc = encodeURIComponent(p.slug);
  const href = `${productBase.replace(/\/$/, "")}/${slugEnc}`;
  const img = (p.image ?? "").trim() || "/favicon.ico";
  const desc = plainExcerpt(p.description, 220);
  const cardClass = first
    ? "card media-card media-card--card media-card--overlap"
    : "card media-card media-card--card";
  const count = Number.isFinite(p.stock) ? String(p.stock) : "0";

  return `<div class="${cardClass}" style="--motion-translateY: 0px; opacity: 1; visibility: visible;"><a href="${escapeAttr(
    href,
  )}" class="media-card__link flex flex-col w-full h-full relative" aria-label="${escapeAttr(p.name)}">
      <div class="media media--square relative overflow-hidden"><img src="${escapeAttr(img)}" alt="" width="1200" height="1200" loading="lazy" is="lazy-image" class="loaded"></div>
      <div class="media-card__content flex justify-between items-center gap-4 w-full text-left">
        <div class="media-card__text shrink-1 grid gap-0d5">
          <p>
            <span class="heading reversed-link text-xl-3xl tracking-tighter leading-tight relative">${escapeHtml(
              p.name,
            )}<small class="count font-medium absolute text-xs tracking-none whitespace-nowrap">${escapeHtml(
              count,
            )}</small></span>
          </p>${
            desc
              ? `<p class="leading-none text-xs xl:text-sm">${escapeHtml(desc)}</p>`
              : `<p class="leading-none text-xs xl:text-sm">&nbsp;</p>`
          }</div>${ARROW_SVG}</div>
    </a></div>`;
}

/**
 * Injects catalog cards into the first homepage slider whose markup matches the Philly-style flavor grid
 * (inventory count badge inside the heading). Other sections are left unchanged.
 */
export function applyConceptHomeCatalogToHtml(
  html: string,
  products: ConceptHomeGridProduct[],
  options?: { productPathPrefix?: string },
): string {
  if (!products.length) return html;
  const base = options?.productPathPrefix ?? "/shop/products";
  const newInner = products.map((p, i) => renderConceptFlavorCard(p, base, i === 0)).join("");
  const re =
    /(<motion-list class="card-grid card-grid--4 mobile:card-grid--1 grid"[^>]*>)([\s\S]*?)(<\/motion-list>)/;
  return html.replace(re, (full, open, inner, close) => {
    if (!/small class="count font-medium absolute text-xs/.test(inner)) return full;
    return open + newInner + close;
  });
}
