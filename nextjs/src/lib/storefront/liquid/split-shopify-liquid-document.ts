/**
 * Shopify themes emit a full HTML5 document. Next.js wraps the page in its own document,
 * so we must not nest `<html>/<head>/<body>` inside a div — split for safe injection.
 */
export function splitShopifyLiquidDocument(html: string): { headInner: string; bodyInner: string } {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  let headInner = (headMatch?.[1] ?? "").trim();
  /** Avoid duplicate document titles vs Next metadata. */
  headInner = headInner.replace(/<title[\s\S]*?<\/title>/gi, "").trim();

  let bodyInner = (bodyMatch?.[1] ?? "").trim();
  if (!bodyInner) {
    bodyInner = html
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<head[\s\S]*?<\/head>/i, "")
      .trim();
  }

  return { headInner, bodyInner };
}

/** Cheap fingerprint so client effects re-run when the Liquid HTML changes. */
export function shopifyLiquidHtmlFingerprint(html: string): string {
  let h = 2166136261;
  for (let i = 0; i < html.length; i++) {
    h ^= html.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function matchAttr(tagInner: string, name: string): string | null {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const d = new RegExp(`\\b${esc}\\s*=\\s*"([^"]*)"`, "i");
  const m1 = tagInner.match(d);
  if (m1) return m1[1] ?? null;
  const s = new RegExp(`\\b${esc}\\s*=\\s*'([^']*)'`, "i");
  const m2 = tagInner.match(s);
  if (m2) return m2[1] ?? null;
  const u = new RegExp(`\\b${esc}\\s*=\\s*([^\\s>]+)`, "i");
  const m3 = tagInner.match(u);
  return m3?.[1] ?? null;
}

export type ParsedHeadLink = {
  rel: string;
  href: string;
  media?: string;
  crossOrigin?: "anonymous" | "use-credentials";
  fullTag: string;
};

/**
 * Pull `<link>` tags we must promote to real DOM nodes (stylesheets, preconnects, icons).
 * Browsers often do not apply CSS from `<link rel=stylesheet>` buried inside hidden containers.
 */
export function parseHeadLinkTags(headHtml: string): ParsedHeadLink[] {
  const results: ParsedHeadLink[] = [];
  const linkRe = /<link\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(headHtml))) {
    const inner = m[1] ?? "";
    const fullTag = m[0];
    const href = matchAttr(inner, "href");
    const relRaw = matchAttr(inner, "rel");
    if (!href || !relRaw) continue;
    const rel = relRaw.toLowerCase().trim();
    const allowed =
      rel === "stylesheet" ||
      rel === "preconnect" ||
      rel === "dns-prefetch" ||
      rel === "shortcut icon" ||
      rel === "apple-touch-icon" ||
      rel === "icon" ||
      rel === "canonical";
    if (!allowed) continue;
    const media = matchAttr(inner, "media") ?? undefined;
    const coRaw = (matchAttr(inner, "crossorigin") ?? matchAttr(inner, "crossOrigin") ?? "").toLowerCase();
    const crossOrigin =
      coRaw === "anonymous" || coRaw === "use-credentials" ? (coRaw as "anonymous" | "use-credentials") : undefined;
    results.push({ rel, href, media, crossOrigin, fullTag });
  }
  return results;
}

export type ParsedHeadStyle = { css: string; fullTag: string };

export function parseHeadStyleBlocks(headHtml: string): ParsedHeadStyle[] {
  const out: ParsedHeadStyle[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(headHtml))) {
    out.push({ css: m[1]!.trim(), fullTag: m[0] });
  }
  return out;
}

/** Remove tags we re-inject as React nodes so we do not load them twice. */
export function stripHeadTagsFromMarkup(markup: string, fullTags: string[]): string {
  let h = markup;
  for (const t of fullTags) {
    if (!t) continue;
    const parts = h.split(t);
    if (parts.length > 1) {
      h = parts.join("");
    }
  }
  return h.replace(/\s{2,}/g, " ").trim();
}
