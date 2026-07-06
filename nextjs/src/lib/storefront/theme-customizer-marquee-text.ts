/**
 * Discover / apply the large outline “scrolling text” marquee (`marquee-element` + stencil `strong` label).
 */

export type MarqueeTextCustomizerState = {
  /** Plain text shown in the scrolling outline strip (repeated in each loop cell). */
  text: string;
};

export function normalizeMarqueeTextState(raw: unknown): MarqueeTextCustomizerState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { text: "" };
  const o = raw as Record<string, unknown>;
  return { text: typeof o.text === "string" ? o.text : "" };
}

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

function decodeBasicEntities(t: string): string {
  return t
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Locates the homepage text marquee (outline stencil strip), not the logo/image marquees.
 */
export function findOutlineMarqueeBounds(html: string): { start: number; end: number } | null {
  const markers = [
    '<marquee-element class="scrolling-text scrolling-text--left flex items-center" data-speed="20"',
    '<marquee-element class="scrolling-text scrolling-text--left flex items-center"',
  ];
  for (const marker of markers) {
    let idx = html.indexOf(marker);
    while (idx !== -1) {
      const close = html.indexOf("</marquee-element>", idx);
      if (close === -1) break;
      const chunk = html.slice(idx, close);
      if (
        chunk.includes("with-text") &&
        chunk.includes("with-xtext") &&
        chunk.includes("data-style=\"stencil\"")
      ) {
        return { start: idx, end: close + "</marquee-element>".length };
      }
      idx = html.indexOf(marker, idx + 1);
    }
  }
  return null;
}

export function discoverMarqueeTextFromHtml(html: string): MarqueeTextCustomizerState | null {
  const b = findOutlineMarqueeBounds(html);
  if (!b) return null;
  const chunk = html.slice(b.start, b.end);
  const m = chunk.match(/with-text with-xtext[\s\S]*?<strong>([\s\S]*?)<\/strong>/i);
  if (!m) return null;
  const text = decodeBasicEntities(stripTagsToPlain(m[1] ?? ""));
  return text.trim() ? { text } : null;
}

/**
 * Replaces stencil `<strong>…</strong>` cells inside the outline marquee. Empty `text` skips (keeps theme default).
 */
export function applyMarqueeTextToHtml(html: string, state: MarqueeTextCustomizerState | undefined): string {
  if (!state) return html;
  const n = normalizeMarqueeTextState(state);
  if (!n.text.trim()) return html;

  const bounds = findOutlineMarqueeBounds(html);
  if (!bounds) return html;

  let block = html.slice(bounds.start, bounds.end);
  /** `data-style="stencil"` can appear anywhere on `<em>`; `/g` updates every duplicated marquee cell. */
  const stencilStrongRe =
    /(<em\b(?=[^>]*\bdata-style\s*=\s*["']stencil["'])[^>]*><strong>)([\s\S]*?)(<\/strong><\/em>)/gi;
  block = block.replace(stencilStrongRe, `$1${escapeHtml(n.text.trim())}$3`);

  return html.slice(0, bounds.start) + block + html.slice(bounds.end);
}
