/**
 * Discover / apply hero slideshow fields for Concept-style Shopify HTML exports
 * (`slideshow-element` + `nav[is="slideshow-words"]`).
 */

import type { HeroSliderSlideRow } from "./theme-customizer-content";

export type DiscoveredHeroSliderSlide = {
  sortIndex: number;
  imageUrl: string;
  heading: string;
  buttonText: string;
  buttonHref: string;
};

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scan / save stores Concept exports as `./assets/…`, while the shop serves images under
 * `/shop/theme-assets/{id}/assets/…`. Without this, applying hero slider state would overwrite
 * rewritten src attributes with `./assets/…`, which resolves to `/shop/assets/…` (404).
 */
export function normalizeHeroSlideImageUrlForServedHtml(
  imageUrl: string,
  themeAssetRouteId: string | undefined,
): string {
  const raw = imageUrl.trim();
  if (!raw || !themeAssetRouteId?.trim()) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/")) return raw;
  const id = themeAssetRouteId.trim();
  const pathPart = raw.replace(/^\.\//, "").replace(/^\/+/, "");
  if (!pathPart || !/^assets\//i.test(pathPart)) return raw;
  return `/shop/theme-assets/${id}/${pathPart}`;
}

/** Slider id from `<nav is="slideshow-words" aria-controls="...">` when present. */
function getHeroSlideshowIdFromNav(html: string): string | undefined {
  const navTagMatch = html.match(/<nav\b[^>]*\bis\s*=\s*["']slideshow-words["'][^>]*>/i);
  if (!navTagMatch) return undefined;
  const ac = navTagMatch[0].match(/\baria-controls\s*=\s*["']([^"']+)["']/i);
  return ac?.[1]?.trim();
}

type HeroSlideshowBlock = {
  startIndex: number;
  fullMatch: string;
  openTag: string;
  inner: string;
  closeTag: string;
};

/**
 * The hero carousel is the `<slideshow-element>` whose `id` matches the nav
 * `aria-controls` target. Fallback: first `slideshow-element` (legacy / single-carousel themes).
 */
function findHeroSlideshowBlock(html: string): HeroSlideshowBlock | null {
  const sliderId = getHeroSlideshowIdFromNav(html);

  if (sliderId) {
    const idRe = new RegExp(
      `(<slideshow-element\\b[^>]*\\bid=["']${escapeRegex(sliderId)}["'][^>]*>)([\\s\\S]*?)(</slideshow-element>)`,
      "i",
    );
    const m = idRe.exec(html);
    if (m && m.index !== undefined) {
      return {
        startIndex: m.index,
        fullMatch: m[0],
        openTag: m[1]!,
        inner: m[2]!,
        closeTag: m[3]!,
      };
    }
  }

  const fallback = /(<slideshow-element\b[^>]*>)([\s\S]*?)(<\/slideshow-element>)/i.exec(html);
  if (!fallback || fallback.index === undefined) return null;
  return {
    startIndex: fallback.index,
    fullMatch: fallback[0],
    openTag: fallback[1]!,
    inner: fallback[2]!,
    closeTag: fallback[3]!,
  };
}

function extractHeadingFromSlideWordBlock(block: string): string {
  const h2 = block.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  if (!h2) return "";
  const inner = h2[1] ?? "";
  const words = [...inner.matchAll(/data-word="([^"]+)"/gi)].map((m) => m[1]);
  if (words.length > 0) return words.join(" ").replace(/\s+/g, " ").trim();
  const stripped = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped;
}

/** Img sources inside the hero slideshow carousel (see {@link findHeroSlideshowBlock}). */
export function extractSlideshowImageSources(html: string): string[] {
  const block = findHeroSlideshowBlock(html);
  if (!block) return [];
  const inner = block.inner;
  const out: string[] = [];
  let im: RegExpExecArray | null;
  const re = /<img\b[^>]*\bsrc="([^"]+)"/gi;
  while ((im = re.exec(inner))) {
    out.push(im[1]!);
  }
  return out;
}

export function discoverHeroSliderFromHtml(html: string): DiscoveredHeroSliderSlide[] {
  const images = extractSlideshowImageSources(html);
  const nav = html.match(/<nav\b[^>]*\bis\s*=\s*["']slideshow-words["'][^>]*>([\s\S]*?)<\/nav>/i);
  if (!nav) return [];

  const inner = nav[1]!;
  const chunks = inner
    .split(/(?=<div\b[^>]*class="[^"]*slideshow-word)/i)
    .filter((c) => /<div\b[^>]*class="[^"]*slideshow-word/i.test(c));
  const blocksByIndex = new Map<number, string>();

  for (const chunk of chunks) {
    const dm = chunk.match(/data-index="(\d+)"/i);
    if (!dm) continue;
    const idx = parseInt(dm[1]!, 10);
    if (!Number.isFinite(idx)) continue;
    blocksByIndex.set(idx, chunk);
  }

  const indices = [...blocksByIndex.keys()].sort((a, b) => a - b);
  const slides: DiscoveredHeroSliderSlide[] = [];

  for (const idx of indices) {
    const block = blocksByIndex.get(idx)!;
    const heading = extractHeadingFromSlideWordBlock(block);
    const btnText = block.match(/<span\b[^>]*class="[^"]*btn-text[^"]*"[^>]*>([^<]*)</i)?.[1]?.trim() ?? "";
    const buttonHref = block.match(/<a\b[^>]*\bhref="([^"]*)"/i)?.[1] ?? "";
    slides.push({
      sortIndex: idx,
      imageUrl: images[idx] ?? "",
      heading,
      buttonText: btnText,
      buttonHref: buttonHref,
    });
  }

  return slides;
}

/**
 * Opening tag of a `.slideshow-word` slide: `class` and `data-index` may appear in either order
 * (source HTML is usually class-first; `innerHTML` from the browser often serializes `data-index` first).
 */
function slideshowWordSlideOpenTagRegex(slideIndex: number): string {
  return `<div\\b(?=[^>]*\\bclass="[^"]*slideshow-word[^"]*")(?=[^>]*\\bdata-index="${slideIndex}")[^>]*>`;
}

function replaceNthSlideshowImgSrc(html: string, slideIndex: number, newUrl: string): string {
  const block = findHeroSlideshowBlock(html);
  if (!block) return html;
  let n = 0;
  const inner = block.inner.replace(/<img\b[^>]*\bsrc="[^"]*"/gi, (full) => {
    if (n === slideIndex) {
      const next = full.replace(/\bsrc="[^"]*"/i, `src="${escapeAttr(newUrl)}"`);
      n++;
      return next;
    }
    n++;
    return full;
  });
  const rebuilt = block.openTag + inner + block.closeTag;
  return html.slice(0, block.startIndex) + rebuilt + html.slice(block.startIndex + block.fullMatch.length);
}

function replaceSlideHeading(html: string, slideIndex: number, heading: string): string {
  const esc = escapeHtml(heading.trim());
  const open = slideshowWordSlideOpenTagRegex(slideIndex);
  const re = new RegExp(`(${open}[\\s\\S]*?<h2\\b[^>]*>)([\\s\\S]*?)(</h2>)`, "i");
  return html.replace(re, (_m, openAndH2: string, _inner: string, closeH2: string) => `${openAndH2}${esc}${closeH2}`);
}

function replaceSlideButton(html: string, slideIndex: number, text: string, href: string): string {
  const open = slideshowWordSlideOpenTagRegex(slideIndex);
  let out = html;
  if (href.trim()) {
    const reHref = new RegExp(`(${open}[\\s\\S]*?<a\\b[^>]*href=")([^"]*)(")`, "i");
    const hrefEsc = escapeAttr(href.trim());
    out = out.replace(reHref, (_m, p1: string, _old: string, p3: string) => `${p1}${hrefEsc}${p3}`);
  }
  if (text.trim()) {
    const reTxt = new RegExp(
      `(${open}[\\s\\S]*?<span\\s+[^>]*class="[^"]*btn-text[^"]*"[^>]*>)([\\s\\S]*?)(</span>)`,
      "i",
    );
    const txtEsc = escapeHtml(text.trim());
    out = out.replace(reTxt, (_m, p1: string, _old: string, closeSpan: string) => `${p1}${txtEsc}${closeSpan}`);
  }
  return out;
}

/**
 * Apply hero slider rows (same sortIndex as theme data-index). Empty strings skip that field.
 */
export function applyHeroSliderToHtml(
  html: string,
  slides: HeroSliderSlideRow[] | undefined,
  themeAssetRouteId?: string,
): string {
  if (!slides?.length) return html;
  let out = html;
  const sorted = [...slides].sort((a, b) => a.sortIndex - b.sortIndex);
  for (const slide of sorted) {
    const i = slide.sortIndex;
    if (slide.imageUrl.trim()) {
      const url = normalizeHeroSlideImageUrlForServedHtml(slide.imageUrl.trim(), themeAssetRouteId);
      out = replaceNthSlideshowImgSrc(out, i, url);
    }
    if (slide.heading.trim()) {
      out = replaceSlideHeading(out, i, slide.heading);
    }
    if (slide.buttonText.trim() || slide.buttonHref.trim()) {
      out = replaceSlideButton(out, i, slide.buttonText, slide.buttonHref);
    }
  }
  return out;
}
