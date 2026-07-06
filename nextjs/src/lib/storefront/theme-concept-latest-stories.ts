/**
 * Hydrates the Concept theme “Latest Stories” collage (`blog-grid blog-collage`) with published
 * {@link StorefrontBlogPost} rows.
 */

import type { PublicBlogPostSummary } from "@/lib/storefront/public-catalog";

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

function plainExcerpt(raw: string | null, maxLen: number): string {
  if (!raw?.trim()) return "";
  const t = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="2200" height="1238"><rect fill="%23e5e7eb" width="100%" height="100%"/></svg>`,
  );

const BADGE_STYLES = [
  "--badge-foreground: rgb(236 252 203);--badge-background: rgb(77 124 15);",
  "--badge-foreground: rgb(255 237 213);--badge-background: rgb(249 115 22);",
  "--badge-foreground: rgb(254 226 226);--badge-background: rgb(239 68 68);",
];

const CALENDAR_SVG = `<svg class="icon icon-calendar icon-xs stroke-1" viewBox="0 0 16 16" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5.33325 0.666668V3.40544M10.6666 0.666668V3.40544M14.4999 6.33333H1.49994M6.93325 14.6667H9.06659C11.0268 14.6667 12.0069 14.6667 12.7556 14.2852C13.4141 13.9496 13.9496 13.4142 14.2851 12.7556C14.6666 12.0069 14.6666 11.0269 14.6666 9.06667V7.93334C14.6666 5.97315 14.6666 4.99306 14.2851 4.24437C13.9496 3.5858 13.4141 3.05037 12.7556 2.71481C12.0069 2.33333 11.0268 2.33333 9.06659 2.33333H6.93325C4.97307 2.33333 3.99298 2.33333 3.24429 2.71481C2.58572 3.05037 2.05029 3.5858 1.71473 4.24437C1.33325 4.99306 1.33325 5.97315 1.33325 7.93333V9.06667C1.33325 11.0269 1.33325 12.0069 1.71473 12.7556C2.05029 13.4142 2.58572 13.9496 3.24429 14.2852C3.99298 14.6667 4.97307 14.6667 6.93325 14.6667Z"></path>
    </svg>`;

const COMMENT_SVG = `<svg class="icon icon-comment icon-xs stroke-1" viewBox="0 0 16 16" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5.33325 6.66665H10.6666M5.33325 9.33331H7.99992M14.6666 7.99998C14.6666 11.6819 11.6818 14.6666 7.99992 14.6666C7.24034 14.6666 6.58895 14.5585 5.9841 14.3421C5.41245 14.1376 5.12661 14.0354 5.01693 14.0096C4.00499 13.7716 3.58519 14.4651 2.71302 14.6105C2.28464 14.6818 1.90348 14.3311 1.93903 13.8983C1.97011 13.5198 2.23184 13.1619 2.33628 12.7985C2.5534 12.0429 2.25878 11.4701 1.94752 10.7982C1.55335 9.94729 1.33325 8.99931 1.33325 7.99998C1.33325 4.31808 4.31802 1.33331 7.99992 1.33331C11.6818 1.33331 14.6666 4.31808 14.6666 7.99998Z"></path>
    </svg>`;

function formatStoryDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function replaceBlogCollageGridInner(html: string, newInner: string): string {
  /** Opening tag of the collage wrapper (avoid `lastIndexOf("<div")` picking the wrong ancestor). */
  const openRe = /<div\b[^>]*\bblog-grid\b[^>]*\bblog-collage\b[^>]*>/i;
  const m = html.match(openRe);
  if (!m || m.index === undefined) return html;
  const openTagEnd = m.index + m[0].length;

  let depth = 1;
  let i = openTagEnd;
  while (i < html.length && depth > 0) {
    const closeIdx = html.indexOf("</div>", i);
    const openIdx = html.indexOf("<div", i);
    if (closeIdx === -1) return html;
    if (openIdx !== -1 && openIdx < closeIdx) {
      depth++;
      i = openIdx + 4;
    } else {
      depth--;
      if (depth === 0) {
        return html.slice(0, openTagEnd) + newInner + html.slice(closeIdx);
      }
      i = closeIdx + 6;
    }
  }
  return html;
}

function renderConceptArticleCard(post: PublicBlogPostSummary, postHref: string, badgeStyle: string): string {
  const titleEsc = escapeHtml(post.title);
  const badgeLabel = post.category?.trim() || "Stories";
  const badgeEsc = escapeHtml(badgeLabel);
  const imgSrc = escapeAttr((post.featuredImageUrl ?? "").trim() || PLACEHOLDER_IMAGE);
  const when = post.publishedAt ?? post.updatedAt ?? new Date();
  const dateIso = escapeAttr(when.toISOString());
  const dateLabel = escapeHtml(formatStoryDate(when));
  const excerptRaw = post.excerpt?.trim() || plainExcerpt(post.bodyHtml, 280);
  const excerptEsc = escapeHtml(excerptRaw);

  return `<div class="card article-card relative flex flex-col gap-5 md:gap-8 leading-none"><div class="article-card__media relative overflow-hidden"><div class="badges z-2 absolute grid gap-3"><span class="badge badge--custom font-medium leading-none rounded-full" style="${badgeStyle}" aria-label="${escapeAttr(badgeLabel)}">${badgeEsc}</span></div><a href="${escapeAttr(postHref)}" class="article-card__link block relative media media--landscape" aria-label="${escapeAttr(post.title)}" tabindex="-1"><img src="${imgSrc}" alt="" width="2200" height="1238" loading="lazy" sizes="(max-width: 639px) 100vw, (max-width: 767px) 74vw, 633px" is="lazy-image" class="article-card__image loaded"></a>
    </div><div class="article-card__content flex flex-col gap-5 md:gap-8">
    <div class="grid gap-4 md:gap-5"><ul class="article-card__top flex flex-wrap gap-4"><li class="inline-flex gap-2 text-xs relative">${CALENDAR_SVG}<time datetime="${dateIso}">${dateLabel}</time></li><li class="inline-flex gap-2 text-xs relative">${COMMENT_SVG}<span class="reversed-link">0 comments<span class="sr-only"> on ${titleEsc}</span></span>
            </li></ul><p>
        <a class="article-card__title heading reversed-link text-lg-2xl leading-tight tracking-tight" href="${escapeAttr(postHref)}">${titleEsc}</a>
      </p><div class="article-card__bottom rte leading-normal">${excerptEsc}</div></div>

    <p>
      <a class="link text-sm font-medium leading-tight" href="${escapeAttr(postHref)}">Read more<span class="sr-only"> about ${titleEsc}</span>
      </a>
    </p>
  </div>
</div>`;
}

export function renderConceptLatestStoriesCards(
  posts: PublicBlogPostSummary[],
  options?: { postPathPrefix?: string },
): string {
  if (!posts.length) return "";
  const base = (options?.postPathPrefix ?? "/shop/blog").replace(/\/$/, "");
  return posts
    .map((p, i) =>
      renderConceptArticleCard(p, `${base}/${encodeURIComponent(p.slug)}`, BADGE_STYLES[i % BADGE_STYLES.length]!),
    )
    .join("");
}

export function applyLatestStoriesViewAllHref(html: string, href: string): string {
  const gridIdx = html.indexOf("blog-grid blog-collage");
  if (gridIdx === -1) return html;
  /** Theme rewrites may move `blog.css`; scan the section heading area just above the grid. */
  const sliceStart = Math.max(0, gridIdx - 14000);
  const slice = html.slice(sliceStart, gridIdx);
  const replaced = slice.replace(
    /<a class="button button--secondary icon-with-text" href="#"/,
    `<a class="button button--secondary icon-with-text" href="${escapeAttr(href)}"`,
  );
  if (replaced === slice) return html;
  return html.slice(0, sliceStart) + replaced + html.slice(gridIdx);
}

export function applyConceptLatestStoriesToHtml(
  html: string,
  posts: PublicBlogPostSummary[],
  options?: { postPathPrefix?: string; viewAllHref?: string },
): string {
  if (!posts.length) return html;
  const inner = renderConceptLatestStoriesCards(posts, { postPathPrefix: options?.postPathPrefix });
  if (!inner) return html;
  let out = replaceBlogCollageGridInner(html, inner);
  out = applyLatestStoriesViewAllHref(out, options?.viewAllHref ?? `${(options?.postPathPrefix ?? "/shop/blog").replace(/\/$/, "")}`);
  return out;
}
