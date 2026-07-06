/**
 * Discover / apply the Concept theme's top "announcement bar" — the dark strip above the main
 * header that holds social links on the left, a rotating message slider in the middle, and
 * language/currency switchers on the right.
 *
 * Merchant-editable surface (kept intentionally tight for v1):
 *   - hidden                     → toggles the entire `<div id="shopify-section-…__announcement-bar">`
 *                                   off via `display:none` injected into the section's `<style>`.
 *   - announcements: { text, href }[] → replaces the inner `<announcement-bar>` slide list.
 *
 * We deliberately avoid touching layout/icons/colors here so this rewrite stays robust against
 * theme updates — those can be exposed later if needed.
 */

const SECTION_ID_PREFIX = "shopify-section-sections--";
const SECTION_ID_SUFFIX = "__announcement-bar";

export type TopHeaderAnnouncementSlide = {
  /** Stable id used by the React list editor; does NOT round-trip into HTML. */
  id: string;
  text: string;
  /** Optional click target. Empty string renders the slide as plain copy (matches first stock slide). */
  href: string;
};

/** Social platforms shown on the left side of the announcement bar (`<div class="social-icons …">`). */
export type TopHeaderSocialLinks = {
  facebook: string;
  /** X / Twitter. Identified in HTML by `icon-twitter`. */
  twitter: string;
  instagram: string;
  youtube: string;
};

export type TopHeaderCustomizerState = {
  hidden: boolean;
  announcements: TopHeaderAnnouncementSlide[];
  social: TopHeaderSocialLinks;
};

const EMPTY_SOCIAL: TopHeaderSocialLinks = {
  facebook: "",
  twitter: "",
  instagram: "",
  youtube: "",
};

const PLATFORM_ICON_CLASSES: ReadonlyArray<{
  key: keyof TopHeaderSocialLinks;
  iconClass: string;
}> = [
  { key: "facebook", iconClass: "icon-facebook" },
  { key: "twitter", iconClass: "icon-twitter" },
  { key: "instagram", iconClass: "icon-instagram" },
  { key: "youtube", iconClass: "icon-youtube" },
];

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function genSlideId(seed: number): string {
  return `pf-tophdr-${seed}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeSocialLinks(raw: unknown): TopHeaderSocialLinks {
  if (!isObj(raw)) return { ...EMPTY_SOCIAL };
  return {
    facebook: typeof raw.facebook === "string" ? raw.facebook : "",
    twitter: typeof raw.twitter === "string" ? raw.twitter : "",
    instagram: typeof raw.instagram === "string" ? raw.instagram : "",
    youtube: typeof raw.youtube === "string" ? raw.youtube : "",
  };
}

export function normalizeTopHeaderState(raw: unknown): TopHeaderCustomizerState {
  if (!isObj(raw)) {
    return { hidden: false, announcements: [], social: { ...EMPTY_SOCIAL } };
  }
  const hidden = raw.hidden === true;
  const list = Array.isArray(raw.announcements) ? raw.announcements : [];
  const announcements: TopHeaderAnnouncementSlide[] = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!isObj(row)) continue;
    const text = typeof row.text === "string" ? row.text : "";
    const href = typeof row.href === "string" ? row.href : "";
    let id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : "";
    if (!id) id = genSlideId(i);
    announcements.push({ id, text, href });
  }
  const social = normalizeSocialLinks(raw.social);
  return { hidden, announcements, social };
}

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

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTagsToPlain(fragment: string): string {
  return fragment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Locates the announcement-bar `<div id="shopify-section-sections--<id>__announcement-bar">`
 * wrapper. Sections in this static export are siblings, so we slice up to the next sibling
 * `<div id="shopify-section-` (mirrors `applyConceptShopTheFeedEventsToHtml`).
 */
function findAnnouncementBarSectionBounds(html: string): { start: number; end: number } | null {
  const openRe = new RegExp(`<div\\b[^>]*\\bid="${SECTION_ID_PREFIX}[^"]*${SECTION_ID_SUFFIX}"[^>]*>`, "i");
  const m = html.match(openRe);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  const after = start + m[0].length;
  const nextSiblingIdx = html.indexOf('<div id="shopify-section-', after);
  let end: number;
  if (nextSiblingIdx === -1) {
    end = html.length;
  } else {
    end = nextSiblingIdx;
  }
  return { start, end };
}

/**
 * Locate the social-icons block inside the announcement-bar section. Markup is:
 * `<div class="social-icons …"><ul …>…<li>…</li>…</ul></div>` (no nested divs), so the closing
 * `</ul></div>` pair is a stable terminator.
 */
function findSocialIconsBounds(sectionHtml: string): { start: number; end: number } | null {
  const openRe = /<div\s+class="social-icons[^"]*"[^>]*>/i;
  const m = sectionHtml.match(openRe);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  const after = start + m[0].length;
  const closer = "</ul></div>";
  const closeIdx = sectionHtml.indexOf(closer, after);
  if (closeIdx === -1) return null;
  return { start, end: closeIdx + closer.length };
}

/** Inner slider element bounds, e.g. `<announcement-bar id="Slider-…__announcement-bar" …>…</announcement-bar>`. */
function findInnerSliderBounds(sectionHtml: string): { start: number; end: number } | null {
  const openRe = /<announcement-bar\b[^>]*\bid="Slider-[^"]*__announcement-bar"[^>]*>/i;
  const m = sectionHtml.match(openRe);
  if (!m || m.index === undefined) return null;
  const openTagEnd = m.index + m[0].length;
  const closeIdx = sectionHtml.indexOf("</announcement-bar>", openTagEnd);
  if (closeIdx === -1) return null;
  return { start: openTagEnd, end: closeIdx };
}

/**
 * Read announcement text(s) from the existing HTML so the Scan-homepage button can pre-fill
 * the editor.
 */
export function discoverTopHeaderFromHtml(html: string): TopHeaderCustomizerState | null {
  const bounds = findAnnouncementBarSectionBounds(html);
  if (!bounds) return null;
  const sectionHtml = html.slice(bounds.start, bounds.end);
  const slider = findInnerSliderBounds(sectionHtml);

  const announcements: TopHeaderAnnouncementSlide[] = [];
  if (slider) {
    const inner = sectionHtml.slice(slider.start, slider.end);
    /**
     * Each slide is `<div class="announcement__slide …">…<a|div class="announcement__content …">…
     * <p class="announcement-text …">TEXT</p></a|div></div>`. We pull each slide chunk, then read
     * the optional surrounding `<a href="…">` for the link target and the `<p>` text.
     */
    const slideRe = /<div\s+class="announcement__slide[^"]*"[^>]*>([\s\S]*?)<\/div>(?=\s*<div\s+class="announcement__slide|\s*<\/?(?:button|announcement-bar|div)\b)/gi;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = slideRe.exec(inner))) {
      const slideInner = m[1] ?? "";
      const textM = slideInner.match(/<p[^>]*class="[^"]*announcement-text[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      if (!textM) continue;
      const text = decodeEntities(stripTagsToPlain(textM[1] ?? ""));
      if (!text) continue;
      const hrefM = slideInner.match(/<a\b[^>]*\bhref="([^"]*)"[^>]*\bclass="[^"]*announcement__content/i)
        ?? slideInner.match(/<a\b[^>]*\bclass="[^"]*announcement__content[^"]*"[^>]*\bhref="([^"]*)"/i);
      const href = hrefM ? decodeEntities(hrefM[1] ?? "").trim() : "";
      announcements.push({ id: genSlideId(i), text, href: href === "#" ? "" : href });
      i++;
    }
  }

  /** Detect the merchant's previously-applied hide override so re-opening the customizer reflects it. */
  const sectionStyleM = sectionHtml.match(/<style[^>]*data-pf-tophdr-toggle[^>]*>([\s\S]*?)<\/style>/i);
  const hidden = !!(sectionStyleM && /display\s*:\s*none/i.test(sectionStyleM[1] ?? ""));

  /**
   * Each `<li>` wraps exactly one `<a>` whose inline `<svg>` carries an `icon-<platform>` class.
   * We use that class as the platform key (most stable across themes), then read the existing href.
   * The stock theme uses `href="#"` placeholders → surface those as empty strings so the editor
   * shows blank inputs instead of suggesting a link is already set.
   */
  const social: TopHeaderSocialLinks = { ...EMPTY_SOCIAL };
  let foundAnySocial = false;
  const socialBounds = findSocialIconsBounds(sectionHtml);
  if (socialBounds) {
    const socialBlock = sectionHtml.slice(socialBounds.start, socialBounds.end);
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = liRe.exec(socialBlock))) {
      const li = m[1] ?? "";
      const platform = PLATFORM_ICON_CLASSES.find((p) => li.includes(p.iconClass));
      if (!platform) continue;
      const hrefM = li.match(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/i);
      if (!hrefM) continue;
      const raw = decodeEntities(hrefM[1] ?? "").trim();
      social[platform.key] = raw === "#" ? "" : raw;
      foundAnySocial = true;
    }
  }

  if (announcements.length === 0 && !hidden && !foundAnySocial) return null;
  return { hidden, announcements, social };
}

/** Truck/email-style icon used for stock slides. We reuse one neutral icon so all slides line up visually. */
const ANNOUNCEMENT_ICON_SVG = `<svg class="icon icon-truck icon-xs stroke-1" viewBox="0 0 16 16" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
  <path stroke-linecap="round" stroke-linejoin="round" d="M6.66675 12.6667H9.33342M6.66675 12.6667C6.66675 13.7712 5.77132 14.6667 4.66675 14.6667C3.56218 14.6667 2.66675 13.7712 2.66675 12.6667M6.66675 12.6667C6.66675 11.5621 5.77132 10.6667 4.66675 10.6667C3.56218 10.6667 2.66675 11.5621 2.66675 12.6667M9.33342 12.6667C9.33342 13.7712 10.2288 14.6667 11.3334 14.6667C12.438 14.6667 13.3334 13.7712 13.3334 12.6667M9.33342 12.6667C9.33342 11.5621 10.2288 10.6667 11.3334 10.6667C12.438 10.6667 13.3334 11.5621 13.3334 12.6667M13.3334 12.6667V12.6667C14.438 12.6667 15.3334 11.7712 15.3334 10.6667V4.53334C15.3334 3.41324 15.3334 2.85319 15.1154 2.42536C14.9237 2.04904 14.6177 1.74308 14.2414 1.55133C13.8136 1.33334 13.2535 1.33334 12.1334 1.33334H10.3334C9.40153 1.33334 8.93559 1.33334 8.56805 1.48558C8.07799 1.68857 7.68864 2.07792 7.48566 2.56798C7.33342 2.93552 7.33342 3.40146 7.33342 4.33334V4.33334C7.33342 5.26523 7.33342 5.73117 7.18117 6.09871C6.97819 6.58877 6.58884 6.97811 6.09878 7.1811C5.73124 7.33334 5.2653 7.33334 4.33341 7.33334H1.00008M2.66675 12.6667V12.6667C2.20176 12.6667 1.96927 12.6667 1.77852 12.6156C1.26088 12.4769 0.85656 12.0725 0.717859 11.5549C0.666748 11.3642 0.666748 11.1317 0.666748 10.6667V8.86795C0.666748 8.44463 0.666748 8.23297 0.688385 8.0258C0.734513 7.58411 0.853872 7.15318 1.04157 6.7507C1.1296 6.56192 1.2385 6.38042 1.4563 6.01743V6.01743C1.78307 5.47281 1.94646 5.20049 2.14753 4.97976C2.57779 4.50743 3.14762 4.18479 3.77402 4.05886C4.06674 4.00001 4.38431 4.00001 5.01944 4.00001H7.33342" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

function renderSlide(slide: TopHeaderAnnouncementSlide, isFirst: boolean): string {
  const text = escapeHtml((slide.text ?? "").trim());
  const href = (slide.href ?? "").trim();
  const slideClass = isFirst ? "announcement__slide flex h-full is-selected" : "announcement__slide flex h-full";
  const ariaHidden = isFirst ? "" : ' aria-hidden="true"';

  if (href) {
    return `<div class="${slideClass}"${ariaHidden}><a class="announcement__content flex items-center gap-2" href="${escapeAttr(href)}"${isFirst ? "" : ' tabindex="-1"'}><span class="announcement-icon hidden md:block">${ANNOUNCEMENT_ICON_SVG}</span><p class="announcement-text leading-tight">${text}</p></a></div>`;
  }
  return `<div class="${slideClass}"${ariaHidden}><div class="announcement__content flex items-center gap-2 rte"><span class="announcement-icon hidden md:block">${ANNOUNCEMENT_ICON_SVG}</span><p class="announcement-text leading-tight">${text}</p></div></div>`;
}

/**
 * Apply merchant edits to the announcement bar. Safe no-op when:
 *   - state is undefined,
 *   - the section markup is missing (theme without an announcement bar),
 *   - or the inner slider can't be located.
 */
export function applyTopHeaderToHtml(html: string, state: TopHeaderCustomizerState | undefined): string {
  if (!state) return html;
  const n = normalizeTopHeaderState(state);

  const bounds = findAnnouncementBarSectionBounds(html);
  if (!bounds) return html;

  let sectionHtml = html.slice(bounds.start, bounds.end);

  /**
   * Replace the slide list inside `<announcement-bar id="Slider-…__announcement-bar">…</announcement-bar>`
   * when the merchant supplied at least one slide. Empty list → leave theme defaults alone (avoids
   * accidentally blanking the strip if the merchant clears the input fields and forgets to publish text).
   */
  const cleanSlides = n.announcements
    .map((s) => ({ ...s, text: (s.text ?? "").trim(), href: (s.href ?? "").trim() }))
    .filter((s) => s.text.length > 0);
  if (cleanSlides.length > 0) {
    const inner = findInnerSliderBounds(sectionHtml);
    if (inner) {
      const newInner = cleanSlides.map((s, idx) => renderSlide(s, idx === 0)).join("");
      sectionHtml = sectionHtml.slice(0, inner.start) + newInner + sectionHtml.slice(inner.end);
    }
  }

  /**
   * Rewrite social link `href`s. Empty strings are skipped (theme default `href="#"` is preserved)
   * so a half-filled form doesn't silently null-out untouched icons.
   */
  const socialBounds = findSocialIconsBounds(sectionHtml);
  if (socialBounds) {
    const before = sectionHtml.slice(0, socialBounds.start);
    const after = sectionHtml.slice(socialBounds.end);
    let block = sectionHtml.slice(socialBounds.start, socialBounds.end);
    block = block.replace(/<li\b[^>]*>[\s\S]*?<\/li>/gi, (li) => {
      const platform = PLATFORM_ICON_CLASSES.find((p) => li.includes(p.iconClass));
      if (!platform) return li;
      const url = (n.social[platform.key] ?? "").trim();
      if (!url) return li;
      return li.replace(/(<a\b[^>]*\bhref=")[^"]*(")/i, `$1${escapeAttr(url)}$2`);
    });
    sectionHtml = before + block + after;
  }

  /**
   * Hide-override is implemented as an injected `<style data-pf-tophdr-toggle>` block that targets
   * the section by its specific id. Inject right after the section's own `<style>` block so it wins
   * over theme defaults; if the merchant unhides later, we strip the same marker we injected.
   */
  sectionHtml = sectionHtml.replace(
    /<style\b[^>]*\bdata-pf-tophdr-toggle[^>]*>[\s\S]*?<\/style>/gi,
    "",
  );
  if (n.hidden) {
    const hideCss = `<style data-pf-tophdr-toggle>div[id^="${SECTION_ID_PREFIX}"][id$="${SECTION_ID_SUFFIX}"]{display:none !important;}</style>`;
    /** Prefer to land the override right after the existing `<style>` block; fall back to prepending. */
    const styleEnd = sectionHtml.indexOf("</style>");
    if (styleEnd !== -1) {
      const insertAt = styleEnd + "</style>".length;
      sectionHtml = sectionHtml.slice(0, insertAt) + hideCss + sectionHtml.slice(insertAt);
    } else {
      sectionHtml = hideCss + sectionHtml;
    }
  }

  return html.slice(0, bounds.start) + sectionHtml + html.slice(bounds.end);
}
