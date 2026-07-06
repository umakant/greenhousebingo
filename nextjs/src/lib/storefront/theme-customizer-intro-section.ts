/**
 * Discover / apply the Concept “collage + rich text” intro block (`collage-small with-richtext`).
 */

export type IntroSectionState = {
  heading: string;
  /**
   * Substring of `heading` that appears inside the theme’s decorative underline (`<em class="highlighted-text">`).
   * Must match exactly one contiguous segment of `heading` (case-sensitive). Empty = plain title, no underline.
   */
  headingHighlightWord: string;
  buttonText: string;
  buttonHref: string;
  /** Inner HTML inside `.rte.body` (e.g. `<p>…</p>`). */
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

export function findCollageIntroBounds(html: string): { start: number; end: number } | null {
  const re =
    /<div\b[^>]*\bclass="[^"]*\bcollage-small\b[^"]*\bwith-richtext\b[^"]*"[^>]*>/i;
  const m = re.exec(html);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  const end = findMatchingDivClose(html, start);
  if (end === -1) return null;
  return { start, end };
}

/** Opening `<div>` whose class includes both `rte` and `body` (order-independent). */
function rteBodyDivOpenRe(): RegExp {
  return /<div\b[^>]*\bclass="(?=[^"]*\brte\b)(?=[^"]*\bbody\b)[^"]*"[^>]*>/i;
}

/** Inner HTML of the intro `.rte.body` column (handles nested divs; not fooled by first `</div>`). */
export function extractRteBodyInnerHtml(block: string): string {
  const m = rteBodyDivOpenRe().exec(block);
  if (!m || m.index === undefined) return "";
  const divOpenStart = m.index;
  const innerStart = block.indexOf(">", divOpenStart) + 1;
  const afterClose = findMatchingDivClose(block, divOpenStart);
  if (afterClose === -1) return "";
  const closeTagStart = afterClose - "</div>".length;
  return block.slice(innerStart, closeTagStart).trim();
}

function replaceIntroRteBody(block: string, newInner: string): string {
  const m = rteBodyDivOpenRe().exec(block);
  if (!m || m.index === undefined) return block;
  const divOpenStart = m.index;
  const innerStart = block.indexOf(">", divOpenStart) + 1;
  const afterClose = findMatchingDivClose(block, divOpenStart);
  if (afterClose === -1) return block;
  const closeTagStart = afterClose - "</div>".length;
  return block.slice(0, innerStart) + newInner.trim() + block.slice(closeTagStart);
}

export function discoverIntroSectionFromHtml(html: string): IntroSectionState | null {
  const bounds = findCollageIntroBounds(html);
  if (!bounds) return null;
  const block = html.slice(bounds.start, bounds.end);

  const h2 = block.match(
    /<h2\b[^>]*\bclass="(?=[^"]*\btitle-md\b)[^"]*"[^>]*>([\s\S]*?)<\/h2>/i,
  );
  const headingInner = h2?.[1] ?? "";
  const heading = headingInner ? stripTagsToPlain(headingInner) : "";

  let headingHighlightWord = "";
  const emInH2 = headingInner.match(/<em\b[^>]*\bhighlighted-text[^>]*>([\s\S]*?)<\/em>/i);
  if (emInH2?.[1]) {
    const beforeSvg = emInH2[1].split("<svg")[0] ?? "";
    headingHighlightWord = stripTagsToPlain(beforeSvg).trim();
  }

  const href = block.match(
    /<a\b[^>]*\bclass="[^"]*button[^"]*"[^>]*\bhref="([^"]*)"/i,
  )?.[1] ?? "";
  const btnSpan = block.match(
    /<span\b[^>]*\bclass="[^"]*btn-text[^"]*"[^>]*>([\s\S]*?)(<svg\b|<\/span>)/i,
  );
  const buttonText = btnSpan ? stripTagsToPlain(btnSpan[1] ?? "").trim() : "";

  const bodyHtml = extractRteBodyInnerHtml(block);

  if (!heading && !headingHighlightWord && !buttonText && !href && !bodyHtml) return null;

  return { heading, headingHighlightWord, buttonText, buttonHref: href, bodyHtml };
}

function escapeAttrValue(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Apply intro fields. Empty strings skip that field (keeps theme default).
 * `bodyHtml` is inserted as HTML inside the `.rte.body` wrapper (trusted admin content).
 */
export function applyIntroSectionToHtml(html: string, intro: IntroSectionState | undefined): string {
  if (!intro) return html;
  const active =
    intro.heading.trim() ||
    (intro.headingHighlightWord ?? "").trim() ||
    intro.buttonText.trim() ||
    intro.buttonHref.trim() ||
    intro.bodyHtml.trim();
  if (!active) return html;

  const bounds = findCollageIntroBounds(html);
  if (!bounds) return html;

  let block = html.slice(bounds.start, bounds.end);

  if (intro.heading.trim()) {
    const full = intro.heading.trim();
    const hw = (intro.headingHighlightWord ?? "").trim();
    /** Concept themes use `title-md` on this heading; allow extra utility classes. */
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

  if (intro.buttonHref.trim()) {
    const hrefEsc = escapeAttrValue(intro.buttonHref.trim());
    block = block.replace(
      /(<a\b[^>]*\bclass="[^"]*button[^"]*"[^>]*\bhref=")([^"]*)(")/i,
      `$1${hrefEsc}$3`,
    );
  }

  if (intro.buttonText.trim()) {
    const esc = escapeHtml(intro.buttonText.trim());
    if (/<span\b[^>]*\bclass="[^"]*btn-text[^"]*"[^>]*>[\s\S]*?<svg\b/i.test(block)) {
      block = block.replace(
        /(<span\b[^>]*\bclass="[^"]*btn-text[^"]*"[^>]*>)([\s\S]*?)(<svg\b)/i,
        `$1${esc}$3`,
      );
    } else {
      block = block.replace(
        /(<span\b[^>]*\bclass="[^"]*btn-text[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/i,
        `$1${esc}$3`,
      );
    }
  }

  if (intro.bodyHtml.trim()) {
    block = replaceIntroRteBody(block, intro.bodyHtml.trim());
  }

  return html.slice(0, bounds.start) + block + html.slice(bounds.end);
}
