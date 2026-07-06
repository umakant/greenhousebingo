/**
 * Single source of truth for social-media URLs across the storefront.
 *
 * The packaged Concept theme renders the same `<a class="social_platform …"><svg class="… icon-<platform> …"></svg></a>`
 * anchor in **multiple** places — announcement bar (top header), floating left rail
 * (`newsletter-bar__social`), drawers, and the footer. Each place has historically been edited
 * independently (see {@link applyTopHeaderToHtml}, {@link applyFooterCustomizerToHtml}), which made
 * it easy for a merchant to update one location and forget the others.
 *
 * This module exposes ONE merchant-editable record `{ facebook, twitter, instagram, youtube }` and
 * one applier that walks every `social_platform` anchor in the served HTML, identifies the platform
 * from its child SVG's `icon-<platform>` class, and rewrites the `href`. Wiring this applier LAST
 * (after the per-section appliers) makes it the authoritative source — empty fields fall back to
 * whatever the per-section appliers left in place (or the theme's `href="#"` placeholder).
 */

export type SocialLinksCustomizerState = {
  facebook: string;
  /** X / Twitter — identified in HTML by `icon-twitter` (theme's class name predates the rebrand). */
  twitter: string;
  instagram: string;
  youtube: string;
};

export const EMPTY_SOCIAL_LINKS_STATE: SocialLinksCustomizerState = {
  facebook: "",
  twitter: "",
  instagram: "",
  youtube: "",
};

/** Mapping platform key → child `<svg>` icon class used in the static theme HTML. */
const PLATFORM_ICON_CLASSES: ReadonlyArray<{
  key: keyof SocialLinksCustomizerState;
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

export function normalizeSocialLinksState(raw: unknown): SocialLinksCustomizerState {
  if (!isObj(raw)) return { ...EMPTY_SOCIAL_LINKS_STATE };
  return {
    facebook: typeof raw.facebook === "string" ? raw.facebook : "",
    twitter: typeof raw.twitter === "string" ? raw.twitter : "",
    instagram: typeof raw.instagram === "string" ? raw.instagram : "",
    youtube: typeof raw.youtube === "string" ? raw.youtube : "",
  };
}

export function isSocialLinksStateEmpty(state: SocialLinksCustomizerState | undefined | null): boolean {
  if (!state) return true;
  return (
    state.facebook.trim() === "" &&
    state.twitter.trim() === "" &&
    state.instagram.trim() === "" &&
    state.youtube.trim() === ""
  );
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

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Pull the *first* non-placeholder href we find for each platform across the entire HTML. Useful
 * for the customizer's Scan button so the merchant doesn't start from blank inputs after a fresh
 * theme install. Placeholder `href="#"` is treated as "not set" so the editor shows blanks.
 */
export function discoverSocialLinksFromHtml(html: string): SocialLinksCustomizerState | null {
  const found: SocialLinksCustomizerState = { ...EMPTY_SOCIAL_LINKS_STATE };
  const anchorRe = /<a\b([^>]*\bclass="[^"]*\bsocial_platform\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  let any = false;
  while ((m = anchorRe.exec(html))) {
    const attrs = m[1] ?? "";
    const inner = m[2] ?? "";
    const platform = PLATFORM_ICON_CLASSES.find((p) => inner.includes(p.iconClass));
    if (!platform) continue;
    if (found[platform.key]) continue; /** First hit wins; later duplicates would just overwrite with the same value. */
    const hrefM = attrs.match(/\bhref="([^"]*)"/i);
    if (!hrefM) continue;
    const raw = decodeBasicEntities(hrefM[1] ?? "").trim();
    if (raw && raw !== "#") {
      found[platform.key] = raw;
      any = true;
    }
  }
  return any ? found : null;
}

/**
 * Rewrites every `social_platform` anchor's `href` for platforms that have a non-empty URL in
 * `state`. Platforms with an empty URL are skipped — that preserves whatever the per-section
 * applier (or the theme default) wrote earlier.
 *
 * Idempotent: re-running with the same state writes the same hrefs.
 */
export function applySocialLinksToHtml(
  html: string,
  state: SocialLinksCustomizerState | undefined | null,
): string {
  if (!state) return html;
  const n = normalizeSocialLinksState(state);
  if (isSocialLinksStateEmpty(n)) return html;

  return html.replace(
    /<a\b([^>]*\bclass="[^"]*\bsocial_platform\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs: string, inner: string) => {
      const platform = PLATFORM_ICON_CLASSES.find((p) => inner.includes(p.iconClass));
      if (!platform) return full;
      const url = (n[platform.key] ?? "").trim();
      if (!url) return full;
      const newAttrs = attrs.replace(/\bhref="[^"]*"/i, `href="${escapeAttr(url)}"`);
      /** If the original `<a>` was missing an explicit `href` (theme oddity), inject one. */
      const safeAttrs = /\bhref="/.test(newAttrs) ? newAttrs : `${newAttrs} href="${escapeAttr(url)}"`;
      return `<a${safeAttrs}>${inner}</a>`;
    },
  );
}
