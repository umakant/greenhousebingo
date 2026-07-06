import "server-only";

const SLIDESHOW_MARKER = '<slideshow-element id="Slider-template--';
const BANNER_CELL_PREFIX = '<div class="banner media--750px mobile:media--500px w-full overflow-hidden flickity-cell';
const WORD_BLOCK_PREFIX = '<div class="slideshow-word flex flex-col md:flex-row md:items-end justify-between gap-6"';

/** Consume one outer `<div>...</div>` balanced by naive `<div` / `</div>` counting (theme markup is regular). */
function consumeOuterDiv(html: string, start: number): { fragment: string; end: number } | null {
  if (!html.startsWith("<div", start)) return null;
  let depth = 0;
  const openEnd = html.indexOf(">", start);
  if (openEnd < 0) return null;
  depth = 1;
  let i = openEnd + 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose < 0) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      i = nextClose + 6;
    }
  }
  return { fragment: html.slice(start, i), end: i };
}

function bannerOpeningTag(fragment: string): string | null {
  const m = /^<div[^>]+>/.exec(fragment);
  return m ? m[0] : null;
}

function innerOfOuterDiv(el: string): string {
  const c = consumeOuterDiv(el, 0);
  if (!c || !el.startsWith("<div")) return "";
  const gt = el.indexOf(">");
  return el.slice(gt + 1, c.end - 6);
}

/** Keep original Flickity cell `style` / layout attrs; replace body with middle slide (same hero art + markup). */
function mergeBannerCell(origCell: string, middleCell: string): string {
  const oOpen = bannerOpeningTag(origCell);
  const mOpen = bannerOpeningTag(middleCell);
  if (!oOpen || !mOpen) return origCell;
  let patchedOpen = oOpen
    .replace(/\s+is-selected\b/g, "")
    .replace(/\sdata-type="video"/gi, ' data-type="image"')
    .replace(/\saria-hidden="[^"]*"/g, "");
  const styleOrig = /\bstyle="[^"]*"/.exec(oOpen);
  const styleMid = /\bstyle="[^"]*"/.exec(mOpen);
  if (styleOrig && styleMid) {
    patchedOpen = patchedOpen.replace(styleMid[0], styleOrig[0]);
  }
  return patchedOpen + middleCell.slice(mOpen.length);
}

function mergeSlideshowWord(origWord: string, middleWord: string, dataIndex: string, ariaCurrent: boolean): string {
  const openTag = /^<div[^>]+>/.exec(origWord)?.[0];
  if (!openTag) return origWord;
  const patchedOpen = openTag
    .replace(/\sdata-index="\d+"/, ` data-index="${dataIndex}"`)
    .replace(/\saria-current="(true|false)"/, ` aria-current="${ariaCurrent ? "true" : "false"}"`);
  const inner = innerOfOuterDiv(middleWord);
  return `${patchedOpen}${inner}</div>`;
}

function extractThreeWordBlocks(
  html: string,
  navInnerStart: number,
  navClose: number,
): { blocks: string[]; startFirst: number; endLast: number } | null {
  let cursor = navInnerStart;
  const blocks: string[] = [];
  let startFirst = -1;
  for (let k = 0; k < 3; k++) {
    const at = html.indexOf(WORD_BLOCK_PREFIX, cursor);
    if (at < 0 || at >= navClose) return null;
    if (k === 0) startFirst = at;
    const consumed = consumeOuterDiv(html, at);
    if (!consumed) return null;
    blocks.push(consumed.fragment);
    cursor = consumed.end;
  }
  return { blocks, startFirst, endLast: cursor };
}

/**
 * Concept OS2 home slideshow: duplicate the **middle** hero slide onto positions 0 and 2 so all three
 * banners and overlay copy/CTA match that slide, while preserving per-cell Flickity transforms.
 */
export function triplicateConceptSlideshowHeroSlides(html: string): string {
  const pos = html.indexOf(SLIDESHOW_MARKER);
  if (pos < 0) return html;

  const innerStart = html.indexOf('<div class="flickity-slider"', pos);
  if (innerStart < 0) return html;

  const afterOpen = html.indexOf(">", innerStart) + 1;
  let cursor = afterOpen;
  const banners: string[] = [];
  for (let i = 0; i < 3; i++) {
    const cellAt = html.indexOf(BANNER_CELL_PREFIX, cursor);
    if (cellAt < 0) return html;
    const consumed = consumeOuterDiv(html, cellAt);
    if (!consumed) return html;
    banners.push(consumed.fragment);
    cursor = consumed.end;
  }

  const mid = banners[1];
  if (!mid) return html;

  const new0 = mergeBannerCell(banners[0]!, mid);
  const new1 = banners[1]!;
  const new2 = mergeBannerCell(banners[2]!, mid);
  const firstCell = html.indexOf(BANNER_CELL_PREFIX, afterOpen);
  if (firstCell < 0) return html;
  const bannerChunkEnd = cursor;
  let out = html.slice(0, firstCell) + new0 + new1 + new2 + html.slice(bannerChunkEnd);

  const navPos = out.indexOf('is="slideshow-words"', pos);
  if (navPos < 0) return out;
  const navOpenEnd = out.indexOf(">", out.indexOf("<nav", navPos)) + 1;
  const navClose = out.indexOf("</nav>", navOpenEnd);
  if (navClose < 0) return out;

  const extracted = extractThreeWordBlocks(out, navOpenEnd, navClose);
  if (!extracted) return out;
  const [w0, w1, w2] = extracted.blocks;
  const nw0 = mergeSlideshowWord(w0, w1, "0", true);
  const nw1 = w1;
  const nw2 = mergeSlideshowWord(w2, w1, "2", false);
  out = out.slice(0, extracted.startFirst) + nw0 + nw1 + nw2 + out.slice(extracted.endLast);

  out = out.replace(/(<slideshow-element[^>]*\s)selected-index="\d+"/, '$1selected-index="0"');
  out = out.replace(/(<nav is="slideshow-words"[^>]*\s)selected-index="\d+"/, '$1selected-index="0"');

  return out;
}
