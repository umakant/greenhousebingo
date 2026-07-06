/**
 * Replace the Concept theme “Build your Bundle” product cards (inside `.product-bundle-wrapper`)
 * with live POS catalog data — same idea as {@link applyConceptHomeCatalogToHtml}.
 */

import type { PublicBundleCatalogProduct } from "@/lib/storefront/bundle-catalog";

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

function patchBundleCardHtml(
  cardHtml: string,
  p: PublicBundleCatalogProduct,
  productPathPrefix: string,
): string {
  let h = cardHtml;
  const imgUrl = (p.image ?? "").trim() || "/favicon.ico";
  const slugEnc = p.slug?.trim() ? encodeURIComponent(p.slug.trim()) : encodeURIComponent(p.id);
  const href = `${productPathPrefix.replace(/\/$/, "")}/${slugEnc}`;
  const imgEsc = escapeAttr(imgUrl);

  if (!/\bdata-pf-product-id\s*=/.test(h)) {
    h = h.replace(/^<div\b/i, `<div data-pf-product-id="${escapeAttr(p.id)}"`);
  } else {
    h = h.replace(/\bdata-pf-product-id\s*=\s*"[^"]*"/i, `data-pf-product-id="${escapeAttr(p.id)}"`);
  }

  h = h.replace(/\.\/assets\/bundle\/[^"'>\s]+/gi, imgEsc);
  h = h.replace(/\bassets\/bundle\/[^"'>\s]+/gi, imgEsc);

  /** Theme carousel imgs often keep `src="#"` / demo srcset until variant JSON supplies `featured_image.src`. */
  h = h.replace(/\bsrc=\"#\"/gi, `src="${imgEsc}"`);
  h = h.replace(/\bsrcset=\"[^"]*\"/gi, (_m) => `srcset="${imgEsc} 360w, ${imgEsc} 720w, ${imgEsc} 1080w"`);

  h = h.replace(/<a\s+([^>]*\bclass="[^"]*\bproduct-card__title\b[^"]*"[^>]*)>([^<]*)<\/a>/i, (_full, attrs: string) => {
    const withoutHref = attrs.replace(/\bhref\s*=\s*"[^"]*"/gi, "").trim();
    return `<a href="${escapeAttr(href)}" ${withoutHref}>${escapeHtml(p.name)}</a>`;
  });

  /** Main gallery anchor is often `href="#"`; make the hero image open the real PDP URL. */
  h = h.replace(/(<div\b[^>]*\bproduct-card__media\b[^>]*>[\s\S]*?<a\b[^>]*\bhref=")#[^"]*(")/i, `$1${escapeAttr(href)}$2`);

  h = h.replace(
    /(<span\s+[^>]*\bclass="[^"]*\bprice__regular\b[^"]*"[^>]*>)\s*\$?[\d.,]+\s*(<\/span>)/i,
    `$1$${p.price.toFixed(2)}$2`,
  );

  h = h.replace(/(\bdata-product-title\s*=\s*")([^"]*)(")/gi, `$1${escapeAttr(p.name)}$3`);
  h = h.replace(/(\bdata-product-image\s*=\s*")([^"]*)(")/gi, `$1${escapeAttr(imgUrl)}$3`);

  const firstVid = String(p.variants[0]?.id ?? "");
  h = h.replace(/(<input[^>]*\bname\s*=\s*"id"[^>]*\bvalue\s*=\s*")([^"]*)(")/i, `$1${escapeAttr(firstVid)}$3`);

  const v0 = p.variants[0]?.themeJson;
  const themeList = p.variants.map((v) => v.themeJson);
  if (v0) {
    const selJson = JSON.stringify(v0).replace(/</g, "\\u003c");
    h = h.replace(/(<script[^>]*\bdata-selected-variant\b[^>]*>)([\s\S]*?)(<\/script>)/i, `$1${selJson}$3`);
  }
  const varsJson = JSON.stringify(themeList).replace(/</g, "\\u003c");
  h = h.replace(/(<script[^>]*\bdata-variants\b[^>]*>)([\s\S]*?)(<\/script>)/i, `$1${varsJson}$3`);

  const opts = p.variants
    .map((v) => {
      const disabled = v.stock <= 0 ? " disabled" : "";
      const label = `${v.name} — $${v.price.toFixed(2)}`;
      return `<option${disabled} value="${escapeAttr(String(v.id))}">${escapeHtml(label)}</option>`;
    })
    .join("");
  h = h.replace(/(<noscript>[\s\S]*?<select[^>]*\bname\s*=\s*"id"[^>]*>)([\s\S]*?)(<\/select>)/i, `$1${opts}$3`);

  h = h.replace(/(\baria-label\s*=\s*"Add\s+)[^"]*(\s+to\s+bundle")/i, `$1${escapeAttr(p.name)}$2`);

  return h;
}

/**
 * Patches the first `motion-list.product-grid` inside `.product-bundle-wrapper`.
 */
export function applyBundleCatalogToHtml(
  html: string,
  products: PublicBundleCatalogProduct[],
  options?: { productPathPrefix?: string },
): string {
  if (!products.length) return html;
  const productPathPrefix = options?.productPathPrefix ?? "/shop/products";

  const re =
    /(<div\s+class="[^"]*\bproduct-bundle-wrapper\b[^"]*"[^>]*>[\s\S]*?<motion-list[^>]*\bclass="[^"]*\bproduct-grid\b[^"]*"[^>]*>)([\s\S]*?)(<\/motion-list>)/i;
  const m = html.match(re);
  if (!m) return html;

  const inner = m[2];
  const segments = inner.split(/(?=<div\b[^>]*\bclass="[^"]*\bcard\b[^"]*\bproduct-card\b)/i);
  const out: string[] = [];
  let pi = 0;
  for (const seg of segments) {
    if (!seg.trim()) continue;
    if (!/^<div\b[^>]*\bclass="[^"]*\bcard\b[^"]*\bproduct-card\b/i.test(seg)) {
      out.push(seg);
      continue;
    }
    const p = products[pi];
    pi += 1;
    if (!p) {
      out.push(seg.replace(/^<div\b/i, `<div style="display:none!important"`));
      continue;
    }
    out.push(patchBundleCardHtml(seg, p, productPathPrefix));
  }

  return html.replace(re, `$1${out.join("")}$3`);
}
