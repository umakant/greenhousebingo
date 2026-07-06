/**
 * Merchant-editable heading + copy above the Concept “Build your bundle” product grid
 * (`collage-large with-richtext` immediately before `.product-bundle-wrapper`).
 */

export type BundleSectionState = {
  heading: string;
  /**
   * Substring of `heading` rendered inside `<em class="highlighted-text">` (scribble underline).
   * Must match one contiguous segment of `heading`. Empty = plain title.
   */
  headingHighlightWord: string;
  /** Inner HTML inside `.description.rte` (trusted admin content). */
  bodyHtml: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTagsToPlain(fragment: string): string {
  return fragment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

export function findBundleSectionBounds(html: string): { start: number; end: number } | null {
  const re = /<div\b[^>]*\bclass="(?=[^"]*\bcollage-large\b)(?=[^"]*\bwith-richtext\b)[^"]*"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const start = m.index;
    const pb = html.indexOf('class="product-bundle-wrapper', start);
    if (pb === -1 || pb - start > 120_000) continue;
    const slice = html.slice(start, pb);
    if (!/<h2\b[^>]*\bclass="[^"]*\btitle-md\b/i.test(slice)) continue;
    const end = findMatchingDivClose(html, start);
    if (end === -1) continue;
    return { start, end };
  }
  return null;
}

export function discoverBundleSectionFromHtml(html: string): BundleSectionState | null {
  const bounds = findBundleSectionBounds(html);
  if (!bounds) return null;
  const block = html.slice(bounds.start, bounds.end);

  const h2 = block.match(/<h2\b[^>]*\bclass="(?=[^"]*\btitle-md\b)[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
  const headingInner = h2?.[1] ?? "";
  const heading = headingInner ? stripTagsToPlain(headingInner) : "";

  let headingHighlightWord = "";
  const emInH2 = headingInner.match(/<em\b[^>]*\bhighlighted-text[^>]*>([\s\S]*?)<\/em>/i);
  if (emInH2?.[1]) {
    const beforeSvg = emInH2[1].split("<svg")[0] ?? "";
    headingHighlightWord = stripTagsToPlain(beforeSvg).trim();
  }

  const desc = block.match(
    /<div\b[^>]*\bclass="(?=[^"]*\bdescription\b)(?=[^"]*\brte\b)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );
  const bodyHtml = desc?.[1]?.trim() ?? "";

  if (!heading && !headingHighlightWord && !bodyHtml) return null;

  return { heading, headingHighlightWord, bodyHtml };
}

export function normalizeBundleSectionState(raw: unknown): BundleSectionState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { heading: "", headingHighlightWord: "", bodyHtml: "" };
  }
  const r = raw as Record<string, unknown>;
  return {
    heading: typeof r.heading === "string" ? r.heading : "",
    headingHighlightWord: typeof r.headingHighlightWord === "string" ? r.headingHighlightWord : "",
    bodyHtml: typeof r.bodyHtml === "string" ? r.bodyHtml : "",
  };
}

/**
 * Apply bundle heading / body. Empty strings skip that field (keeps theme default).
 */
export function applyBundleSectionToHtml(html: string, bundle: BundleSectionState | undefined): string {
  if (!bundle) return html;
  const active =
    bundle.heading.trim() ||
    (bundle.headingHighlightWord ?? "").trim() ||
    bundle.bodyHtml.trim();
  if (!active) return html;

  const bounds = findBundleSectionBounds(html);
  if (!bounds) return html;

  let block = html.slice(bounds.start, bounds.end);

  if (bundle.heading.trim()) {
    const full = bundle.heading.trim();
    const hw = (bundle.headingHighlightWord ?? "").trim();
    const h2Re = /(<h2\b[^>]*\bclass="(?=[^"]*\btitle-md\b)[^"]*"[^>]*>)([\s\S]*?)(<\/h2>)/i;
    const h2Match = block.match(h2Re);
    const inner = h2Match?.[2] ?? "";
    const emMatch = inner.match(/(<em\b[^>]*\bhighlighted-text[^>]*>)([\s\S]*?)(<\/em>)/i);
    const idx = hw ? full.indexOf(hw) : -1;
    if (hw && emMatch && idx !== -1) {
      const before = full.slice(0, idx);
      const after = full.slice(idx + hw.length);
      const svgPart = emMatch[2].includes("<svg") ? emMatch[2].slice(emMatch[2].indexOf("<svg")) : "";
      const newInner =
        escapeHtml(before) + emMatch[1] + escapeHtml(hw) + svgPart + "</em>" + escapeHtml(after);
      block = block.replace(h2Re, `$1${newInner}$3`);
    } else {
      block = block.replace(h2Re, `$1${escapeHtml(full)}$3`);
    }
  }

  if (bundle.bodyHtml.trim()) {
    const descRe =
      /(<div\b[^>]*\bclass="(?=[^"]*\bdescription\b)(?=[^"]*\brte\b)[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/i;
    block = block.replace(descRe, `$1${bundle.bodyHtml.trim()}$3`);
  }

  return html.slice(0, bounds.start) + block + html.slice(bounds.end);
}
