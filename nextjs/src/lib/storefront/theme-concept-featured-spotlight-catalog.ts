/**
 * Hydrates the Concept homepage `.featured-product` spotlight with the merchant’s Featured POS product
 * (`storefrontFeatured` — “Featured product” toggle in catalog).
 */

import type { PublicCatalogProduct, PublicStorefrontHighlight } from "@/lib/storefront/public-catalog";
import {
  effectiveVariantStockUnits,
  parsePosProductVariants,
  shopifyLikeVariantJson,
} from "@/lib/storefront/bundle-catalog";
import { canSellQty, parseInventoryPolicy, type InventoryPolicy } from "@/lib/storefront/inventory-storefront";

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

function productPrimaryImages(p: PublicCatalogProduct): string[] {
  const g = [...(p.galleryImages ?? [])].map((x) => String(x).trim()).filter(Boolean);
  const primary = p.image?.trim();
  const merged = primary ? [primary, ...g.filter((x) => x !== primary)] : g;
  return merged.length ? merged : ["/favicon.ico"];
}

function spotlightVariantRows(p: PublicCatalogProduct): Array<{ id: string; name: string; price: number; stock: number }> {
  const parsed = parsePosProductVariants(p.variants);
  if (parsed.length === 0) {
    return [{ id: "__base", name: "Default", price: p.price, stock: p.stock }];
  }
  return parsed.map((v) => ({
    id: v.id!,
    name: v.name!,
    price: Number.isFinite(v.price) ? v.price! : p.price,
    stock: effectiveVariantStockUnits(v, p.stock),
  }));
}

function buildMediaSlides(urls: string[]): string {
  const u = urls.slice(0, 8);
  return u
    .map(
      (src) =>
        `<div class="product__media card media media--adapt_first mobile:media--adapt_first flex w-full shrink-0 relative overflow-hidden" data-media-type="image"><img src="${escapeAttr(
          src,
        )}" alt="" width="2000" height="2000" loading="lazy" fetchpriority="auto" sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), 75vw" class="w-full" is="lazy-image"><button type="button" class="absolute top-0 left-0 w-full h-full flex items-center justify-center" is="media-lightbox-button" aria-label="Open media" tabindex="-1"><svg class="icon icon-zoom icon-xs lg:hidden" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3V9M3 3H9M3 3L9 9M21 21V15M21 21H15M21 21L15 15"></path></svg></button></div>`,
    )
    .join("");
}

function buildThumbnailButtons(urls: string[]): string {
  const u = urls.slice(0, 8);
  return u
    .map(
      (src, i) =>
        `<button type="button" class="product__thumbnail media media--adapt_first mobile:media--adapt_first relative overflow-hidden" aria-current="${i === 0 ? "true" : "false"}" data-index="${
          i + 1
        }"><img src="${escapeAttr(src)}" alt="" width="400" height="400" loading="lazy" sizes="(max-width: 1279px) 180px, 200px" is="lazy-image"></button>`,
    )
    .join("");
}

function buildFlavorSwatches(
  block: string,
  variants: Array<{ id: string; name: string; price: number; stock: number }>,
  imgForVariant: (i: number) => string,
  checkedIndex: number,
  policy: InventoryPolicy,
): string {
  const nameMatch = block.match(/name="(Color-[^"]+)"/);
  const radioName = nameMatch?.[1] ?? "Color-pf-spotlight";
  const lis = variants
    .map((v, i) => {
      const checked = i === checkedIndex ? ` checked=""` : "";
      const sellable = canSellQty(v.stock, 1, policy);
      const disabled = !sellable ? ` disabled=""` : "";
      const inputCls = !sellable ? ` class="sr-only disabled"` : ` class="sr-only"`;
      const id = `pf-spotlight-flavor-${i}`;
      const img = imgForVariant(i);
      return `<li><magnet-element class="block"><input type="radio"${inputCls}${disabled} id="${id}" name="${escapeAttr(
        radioName,
      )}" value="${escapeAttr(v.name)}"${checked} data-option-value="${escapeAttr(
        v.name,
      )}" data-option-index="1" align-selected=".scroll-area"><label for="${id}" class="color-swatch with-image cursor-pointer block relative aspect-adapt_first mobile:aspect-adapt_first" title="${escapeAttr(
        v.name,
      )}" style="--swatch-background: rgb(200,200,200);--swatch-background-image: url(${escapeAttr(img)});"><span class="sr-only">${escapeHtml(
        v.name,
      )}</span></label></magnet-element></li>`;
    })
    .join("");
  return lis;
}

function patchFeaturedSpotlightBlock(
  block: string,
  p: PublicCatalogProduct,
  opts: { productPathPrefix: string; productHref: string },
): string {
  let h = block;
  const policy = parseInventoryPolicy(p.inventoryPolicy);
  const variants = spotlightVariantRows(p);
  let firstIdx = variants.findIndex((v) => canSellQty(v.stock, 1, policy));
  if (firstIdx < 0) firstIdx = 0;
  const first = variants[firstIdx]!;
  const imgs = productPrimaryImages(p);
  const imgAt = (i: number) => imgs[Math.min(i, imgs.length - 1)]!;

  h = h.replace(/<product-info\b/, `<product-info data-pf-product-id="${escapeAttr(p.id)}"`);

  const jsonList = variants.map((v, idx) =>
    shopifyLikeVariantJson({
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      variantName: v.name,
      priceDollars: v.price,
      imageUrl: imgAt(idx),
      available: canSellQty(v.stock, 1, policy),
    }),
  );

  h = h.replace(/\bdata-product-url="\/products\/[^"]*"/gi, `data-product-url="${escapeAttr(opts.productHref)}"`);
  h = h.replace(/\bdata-product-url="\/shop\/products\/[^"]*"/gi, `data-product-url="${escapeAttr(opts.productHref)}"`);

  h = h.replace(
    /<h2 class="heading leading-none product-title-md mobile:product-title-md col-span-full">[\s\S]*?<\/h2>/,
    `<h2 class="heading leading-none product-title-md mobile:product-title-md col-span-full">${escapeHtml(p.name)}</h2>`,
  );

  h = h.replace(/(<span class="price__regular whitespace-nowrap">)\s*\$?[\d.,]+\s*(<\/span>)/i, (_m, a, b) => {
    return `${String(a)}$${p.price.toFixed(2)}${String(b)}`;
  });

  const desc = p.description?.trim() ? escapeHtml(stripHtmlToOneLine(p.description)) : escapeHtml(p.name);
  h = h.replace(
    /(<div class="product__text first last">[\s\S]*?<div class="product__text-inner flex items-center gap-2d5"><p class="rte text-base lg:text-lg leading-tight">)([\s\S]*?)(<\/p>)/,
    `$1${desc}$3`,
  );

  h = h.replace(
    /(<div class="product__media-list flex gap-1">)([\s\S]*?)(<\/div>\s*<\/slider-element>)/,
    `$1${buildMediaSlides(imgs)}$3`,
  );

  h = h.replace(
    /(<media-dots class="product__thumbnails-list scroll-area grid[^"]*"[^>]*>)([\s\S]*?)(<\/media-dots>)/,
    `$1${buildThumbnailButtons(imgs)}$3`,
  );

  h = h.replace(
    /(<span class="font-medium" id="[^"]*-option1">)[^<]*(<\/span>)/,
    `$1${escapeHtml(first.name)}$2`,
  );

  const swHtml = buildFlavorSwatches(h, variants, imgAt, firstIdx, policy);
  h = h.replace(
    /(<ul class="swatches swatches--round swatches--variant flex items-start flex-wrap gap-4">)([\s\S]*?)(<\/ul>\s*<\/fieldset>\s*<script type="application\/json" data-selected-variant)/i,
    `$1${swHtml}$3`,
  );

  const selJson = JSON.stringify(jsonList[firstIdx]).replace(/</g, "\\u003c");
  const varsJson = JSON.stringify(jsonList).replace(/</g, "\\u003c");
  h = h.replace(
    /(<script type="application\/json" data-selected-variant[^>]*>)([\s\S]*?)(<\/script>)/i,
    `$1${selJson}$3`,
  );
  h = h.replace(
    /(<script type="application\/json" data-variants[^>]*>)([\s\S]*?)(<\/script>)/i,
    `$1${varsJson}$3`,
  );

  const optsHtml = variants
    .map((v, i) => {
      const sellable = canSellQty(v.stock, 1, policy);
      const dis = !sellable ? " disabled\n" : "\n";
      const sold = !sellable ? " - Sold Out" : "";
      const sel = i === firstIdx ? "\n            selected\n" : "";
      return `<option${sel}${dis}            value="${escapeAttr(v.id)}">\n            ${escapeHtml(v.name)}${sold}\n            - $${v.price.toFixed(2)}\n          </option>`;
    })
    .join("");
  h = h.replace(
    /(<noscript>[\s\S]*?<select[^>]*class="select"[^>]*form="[^"]+">)([\s\S]*?)(<\/select>)/i,
    `$1${optsHtml}$3`,
  );

  const firstVid = escapeAttr(first.id);
  h = h.replace(/(<input type="hidden" name="id" value=")[^"]*(")/gi, `$1${firstVid}$2`);

  h = h.replace(/<button([^>]*\bproduct-form__submit\b[^>]*)>/i, (_full, attrs: string) => {
    const trimmed = attrs.replace(/\baria-label\s*=\s*"[^"]*"/i, "").trim();
    return `<button aria-label="Add ${escapeAttr(p.name)} to cart" ${trimmed}>`;
  });

  const hl = p.storefrontHighlights;
  if (hl && hl.length > 0) {
    const inner = buildSpotlightHighlightIconsInnerHtml(hl);
    h = h.replace(
      /<scroll-shadow class="product-card__spec block overflow-hidden">[\s\S]*?<\/scroll-shadow>/i,
      `<scroll-shadow class="product-card__spec block overflow-hidden">
            <div class="product-card__icons flex flex-nowrap lg:flex-wrap" is="icons-carousel">${inner}</div>
            <template></template>
          </scroll-shadow>`,
    );
  }
  const hlHeading = p.storefrontHighlightsHeading?.trim();
  if (hlHeading) {
    h = h.replace(
      /<p class="font-medium leading-tight md:text-lg">Why you'll love it<\/p>/i,
      `<p class="font-medium leading-tight md:text-lg">${escapeHtml(hlHeading)}</p>`,
    );
  }

  return h;
}

function stripHtmlToOneLine(raw: string): string {
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Theme default icon when a highlight has no `imageUrl` (Concept export ships this asset). */
const SPOTLIGHT_HIGHLIGHT_FALLBACK_ICON = "./assets/icons/driver-size.svg";

function buildSpotlightHighlightIconsInnerHtml(items: PublicStorefrontHighlight[]): string {
  return items
    .map((it) => {
      const img = it.imageUrl?.trim() ? escapeAttr(it.imageUrl.trim()) : SPOTLIGHT_HIGHLIGHT_FALLBACK_ICON;
      const alt = escapeAttr(it.title.slice(0, 64));
      const sub = it.subtitle?.trim()
        ? `<p class="text-opacity font-normal text-xs leading-tight">${escapeHtml(it.subtitle.trim())}</p>`
        : "";
      return `<div class="product-card__icon shrink-0">
                  <div class="flex flex-col items-center md:flex-row md:items-start gap-2"><figure class="shrink-0 media media--transparent relative inline-block"><img src="${img}" alt="${alt}" width="32" height="32" loading="lazy" sizes="32px" class="w-full h-full" is="lazy-image"></figure><div class="flex flex-col items-center md:items-start gap-1 text-center md:text-left text-sm font-medium leading-none">${escapeHtml(it.title)}${sub}</div>
                  </div>
                </div>`;
    })
    .join("");
}

/**
 * Replaces the static “Philly favorites” / demo spotlight with `product` when the theme markup includes
 * `class="featured-product product product--thumbnail"`.
 */
export function applyFeaturedSpotlightCatalogToHtml(
  html: string,
  product: PublicCatalogProduct,
  options?: { productPathPrefix?: string },
): string {
  const startToken = '<div class="featured-product product product--thumbnail';
  const start = html.indexOf(startToken);
  if (start === -1) return html;
  const ldNeedle = '<script type="application/ld+json">';
  const end = html.indexOf(ldNeedle, start + startToken.length);
  if (end === -1) return html;

  const slugEnc = product.slug?.trim()
    ? encodeURIComponent(product.slug.trim())
    : encodeURIComponent(product.id);
  const prefix = (options?.productPathPrefix ?? "/shop/products").replace(/\/$/, "");
  const productHref = `${prefix}/${slugEnc}`;

  const block = html.slice(start, end);
  const patched = patchFeaturedSpotlightBlock(block, product, { productPathPrefix: prefix, productHref });
  return html.slice(0, start) + patched + html.slice(end);
}
