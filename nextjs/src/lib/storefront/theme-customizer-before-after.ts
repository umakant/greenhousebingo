/**
 * Discover / apply the Concept homepage image-comparison (“Before & after”) block.
 */

export type BeforeAfterSectionState = {
  subheading: string;
  mainHeading: string;
  beforeImageUrl: string;
  beforeImageAlt: string;
  beforeLabelSmall: string;
  beforeLabelLarge: string;
  afterImageUrl: string;
  afterImageAlt: string;
  afterLabelSmall: string;
  afterLabelLarge: string;
};

export function normalizeBeforeAfterSectionState(raw: unknown): BeforeAfterSectionState {
  const empty = (): BeforeAfterSectionState => ({
    subheading: "",
    mainHeading: "",
    beforeImageUrl: "",
    beforeImageAlt: "",
    beforeLabelSmall: "",
    beforeLabelLarge: "",
    afterImageUrl: "",
    afterImageAlt: "",
    afterLabelSmall: "",
    afterLabelLarge: "",
  });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty();
  const o = raw as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  return {
    subheading: s("subheading"),
    mainHeading: s("mainHeading"),
    beforeImageUrl: s("beforeImageUrl"),
    beforeImageAlt: s("beforeImageAlt"),
    beforeLabelSmall: s("beforeLabelSmall"),
    beforeLabelLarge: s("beforeLabelLarge"),
    afterImageUrl: s("afterImageUrl"),
    afterImageAlt: s("afterImageAlt"),
    afterLabelSmall: s("afterLabelSmall"),
    afterLabelLarge: s("afterLabelLarge"),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function stripTagsToPlain(fragment: string): string {
  return fragment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeBasicEntities(t: string): string {
  return t
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** First `<image-comparison>` that contains a before/after comparison layout. */
export function findFirstImageComparisonBlock(html: string): { start: number; end: number } | null {
  const needle = "<image-comparison";
  let idx = html.indexOf(needle);
  while (idx !== -1) {
    const closeIdx = html.indexOf("</image-comparison>", idx);
    if (closeIdx === -1) return null;
    const end = closeIdx + "</image-comparison>".length;
    const slice = html.slice(idx, end);
    if (slice.includes("comparison__before") && slice.includes("comparison__after")) {
      return { start: idx, end };
    }
    idx = html.indexOf(needle, idx + 1);
  }
  return null;
}

function findTitleInnerSlice(html: string, comparisonStart: number): { start: number; end: number } | null {
  const pw = html.lastIndexOf('<div class="page-width relative">', comparisonStart);
  if (pw === -1) return null;
  const innerStart = pw + '<div class="page-width relative">'.length;
  return { start: innerStart, end: comparisonStart };
}

function extractImgSrcAlt(fragment: string): { src: string; alt: string } {
  const a = fragment.match(/<img\b[^>]*\bsrc="([^"]*)"[^>]*\balt="([^"]*)"/i);
  if (a) return { src: a[1] ?? "", alt: a[2] ?? "" };
  const b = fragment.match(/<img\b[^>]*\balt="([^"]*)"[^>]*\bsrc="([^"]*)"/i);
  if (b) return { src: b[2] ?? "", alt: b[1] ?? "" };
  return { src: "", alt: "" };
}

function extractLabelPair(fragment: string): { small: string; large: string } {
  const m = fragment.match(
    /<div class="grid gap-1 md:gap-2"><p class="[^"]*">([\s\S]*?)<\/p><p class="heading[^"]*">([\s\S]*?)<\/p><\/div>/i,
  );
  if (!m) return { small: "", large: "" };
  return {
    small: decodeBasicEntities(stripTagsToPlain(m[1] ?? "")),
    large: decodeBasicEntities(stripTagsToPlain(m[2] ?? "")),
  };
}

export function discoverBeforeAfterFromHtml(html: string): BeforeAfterSectionState | null {
  const cb = findFirstImageComparisonBlock(html);
  if (!cb) return null;

  const titleSlice = findTitleInnerSlice(html, cb.start);
  let subheading = "";
  let mainHeading = "";
  if (titleSlice) {
    const region = html.slice(titleSlice.start, titleSlice.end);
    const sub = region.match(
      /<p class="heading normal-case font-medium subtext-lg leading-none tracking-none">([\s\S]*?)<\/p>/i,
    );
    subheading = sub ? decodeBasicEntities(stripTagsToPlain(sub[1] ?? "")) : "";
    const h2 = region.match(/<h2 class="heading title-md">([\s\S]*?)<\/h2>/i);
    mainHeading = h2 ? decodeBasicEntities(stripTagsToPlain(h2[1] ?? "")) : "";
  }

  const block = html.slice(cb.start, cb.end);
  const afterOpen = block.indexOf('<div class="comparison__after');
  const btnIdx = block.indexOf('<button type="button" class="comparison__button');
  const beforePart = afterOpen === -1 ? block : block.slice(0, afterOpen);
  const afterPart =
    afterOpen === -1 ? "" : block.slice(afterOpen, btnIdx === -1 ? block.length : btnIdx);

  const imgB = extractImgSrcAlt(beforePart);
  const imgA = extractImgSrcAlt(afterPart);
  const labB = extractLabelPair(beforePart);
  const labA = extractLabelPair(afterPart);

  const state = normalizeBeforeAfterSectionState({
    subheading,
    mainHeading,
    beforeImageUrl: imgB.src,
    beforeImageAlt: imgB.alt,
    beforeLabelSmall: labB.small,
    beforeLabelLarge: labB.large,
    afterImageUrl: imgA.src,
    afterImageAlt: imgA.alt,
    afterLabelSmall: labA.small,
    afterLabelLarge: labA.large,
  });

  const any =
    state.subheading.trim() ||
    state.mainHeading.trim() ||
    state.beforeImageUrl.trim() ||
    state.beforeImageAlt.trim() ||
    state.beforeLabelSmall.trim() ||
    state.beforeLabelLarge.trim() ||
    state.afterImageUrl.trim() ||
    state.afterImageAlt.trim() ||
    state.afterLabelSmall.trim() ||
    state.afterLabelLarge.trim();

  return any ? state : null;
}

function replaceFirstImgSrcAlt(fragment: string, src: string, alt: string): string {
  let out = fragment;
  if (src.trim()) {
    if (/\bsrc="[^"]*"/i.test(out)) out = out.replace(/\bsrc="[^"]*"/i, `src="${escapeAttr(src.trim())}"`);
  }
  if (alt.trim()) {
    if (/\balt="[^"]*"/i.test(out)) out = out.replace(/\balt="[^"]*"/i, `alt="${escapeAttr(alt.trim())}"`);
  }
  return out;
}

function replaceLabelPair(fragment: string, small: string, large: string): string {
  return fragment.replace(
    /(<div class="grid gap-1 md:gap-2"><p class="[^"]*">)([\s\S]*?)(<\/p><p class="heading[^"]*">)([\s\S]*?)(<\/p><\/div>)/i,
    `$1${escapeHtml(small.trim())}$3${escapeHtml(large.trim())}$5`,
  );
}

/**
 * Apply before/after fields. Empty strings skip that field (keeps theme default).
 */
export function applyBeforeAfterSectionToHtml(html: string, section: BeforeAfterSectionState | undefined): string {
  if (!section) return html;
  const n = normalizeBeforeAfterSectionState(section);
  const active =
    n.subheading.trim() ||
    n.mainHeading.trim() ||
    n.beforeImageUrl.trim() ||
    n.beforeImageAlt.trim() ||
    n.beforeLabelSmall.trim() ||
    n.beforeLabelLarge.trim() ||
    n.afterImageUrl.trim() ||
    n.afterImageAlt.trim() ||
    n.afterLabelSmall.trim() ||
    n.afterLabelLarge.trim();
  if (!active) return html;

  let out = html;
  const cb = findFirstImageComparisonBlock(out);
  if (!cb) return html;

  const titleSlice = findTitleInnerSlice(out, cb.start);
  if (titleSlice) {
    let mid = out.slice(titleSlice.start, titleSlice.end);
    if (n.subheading.trim()) {
      mid = mid.replace(
        /(<p class="heading normal-case font-medium subtext-lg leading-none tracking-none">)([\s\S]*?)(<\/p>)/i,
        `$1${escapeHtml(n.subheading.trim())}$3`,
      );
    }
    if (n.mainHeading.trim()) {
      mid = mid.replace(/(<h2 class="heading title-md">)([\s\S]*?)(<\/h2>)/i, (_, open, inner, close) => {
        const em = inner.match(/(<em\b[^>]*>)([\s\S]*?)(<\/em>)/i);
        if (em) return `${open}${em[1]}${escapeHtml(n.mainHeading.trim())}${em[3]}${close}`;
        return `${open}${escapeHtml(n.mainHeading.trim())}${close}`;
      });
    }
    out = out.slice(0, titleSlice.start) + mid + out.slice(titleSlice.end);
  }

  const cb2 = findFirstImageComparisonBlock(out);
  if (!cb2) return out;

  let comp = out.slice(cb2.start, cb2.end);
  const afterOpen = comp.indexOf('<div class="comparison__after');
  const btnIdx = comp.indexOf('<button type="button" class="comparison__button');
  const endCompare = btnIdx === -1 ? comp.length : btnIdx;

  if (afterOpen === -1) {
    out = out.slice(0, cb2.start) + comp + out.slice(cb2.end);
    return out;
  }

  let beforePart = comp.slice(0, afterOpen);
  let afterPart = comp.slice(afterOpen, endCompare);

  if (n.beforeImageUrl.trim() || n.beforeImageAlt.trim()) {
    beforePart = replaceFirstImgSrcAlt(beforePart, n.beforeImageUrl, n.beforeImageAlt);
  }
  if (n.beforeLabelSmall.trim() && n.beforeLabelLarge.trim()) {
    beforePart = replaceLabelPair(beforePart, n.beforeLabelSmall, n.beforeLabelLarge);
  } else if (n.beforeLabelSmall.trim()) {
    beforePart = beforePart.replace(
      /(<div class="grid gap-1 md:gap-2"><p class="[^"]*">)([\s\S]*?)(<\/p>)/i,
      `$1${escapeHtml(n.beforeLabelSmall.trim())}$3`,
    );
  } else if (n.beforeLabelLarge.trim()) {
    beforePart = beforePart.replace(
      /(<p class="heading[^"]*"[^>]*>)([\s\S]*?)(<\/p><\/div>)/i,
      `$1${escapeHtml(n.beforeLabelLarge.trim())}$3`,
    );
  }

  if (n.afterImageUrl.trim() || n.afterImageAlt.trim()) {
    afterPart = replaceFirstImgSrcAlt(afterPart, n.afterImageUrl, n.afterImageAlt);
  }
  if (n.afterLabelSmall.trim() && n.afterLabelLarge.trim()) {
    afterPart = replaceLabelPair(afterPart, n.afterLabelSmall, n.afterLabelLarge);
  } else if (n.afterLabelSmall.trim()) {
    afterPart = afterPart.replace(
      /(<div class="grid gap-1 md:gap-2"><p class="[^"]*">)([\s\S]*?)(<\/p>)/i,
      `$1${escapeHtml(n.afterLabelSmall.trim())}$3`,
    );
  } else if (n.afterLabelLarge.trim()) {
    afterPart = afterPart.replace(
      /(<p class="heading[^"]*"[^>]*>)([\s\S]*?)(<\/p><\/div>)/i,
      `$1${escapeHtml(n.afterLabelLarge.trim())}$3`,
    );
  }

  comp = beforePart + afterPart + comp.slice(endCompare);
  out = out.slice(0, cb2.start) + comp + out.slice(cb2.end);
  return out;
}
