/**
 * Replaces the Concept theme "Shop the Feed" Instagram-style section with an Events grid that
 * reuses the **theme's own visual language** — same `section section--padding section--rounded`
 * outer, same `title-wrapper` heading layout (with the scribble-underline emphasis word), same
 * `card-grid card-grid--4 mobile:card-grid--1` layout, and same `media-card media-card--card
 * media-card--overlap` cards. Driven by published rows in `storefront_events`.
 *
 * This keeps the section visually indistinguishable from the original Shop the Feed block —
 * we only swap the content (date/title/location overlay instead of product hotspots).
 */
import type { StorefrontEventRow } from "@/lib/storefront/storefront-events-prisma";

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

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600"><rect fill="%23111827" width="100%" height="100%"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="64" fill="%23e5e7eb" text-anchor="middle" dominant-baseline="central">Event</text></svg>`,
  );

/** Hand-drawn squiggle the theme uses under the emphasis word in `Shop the Feed`. */
const SCRIBBLE_SVG = `<svg class="icon icon-squiggle-underline" viewBox="-347 -30.1947 694 96.19" stroke="currentColor" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
  <path stroke-linecap="round" stroke-width="20" pathLength="1" d="M-335,54 C-335,54 -171,-58 -194,-3 C-217,52 -224.1199951171875,73.552001953125 -127,11 C-68,-27 -137,50 -33,42 C31.43899917602539,37.042999267578125 147.14700317382812,-29.308000564575195 335,2"></path>
</svg>`;

/** Calendar icon (replaces the IG badge in the card corner). */
const CALENDAR_ICON_SVG = `<svg class="icon icon-calendar icon-lg" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg" role="presentation">
  <path stroke-linecap="round" stroke-linejoin="round" d="M8 2v3M16 2v3M21 9.5H3M9.5 22h5c2.94 0 4.41 0 5.54-0.57a5.25 5.25 0 0 0 2.3-2.3c0.57-1.13 0.57-2.6 0.57-5.54v-1.7c0-2.94 0-4.41-0.57-5.54a5.25 5.25 0 0 0-2.3-2.3C18.91 3.5 17.44 3.5 14.5 3.5h-5c-2.94 0-4.41 0-5.54 0.57a5.25 5.25 0 0 0-2.3 2.3C1.09 7.5 1.09 8.97 1.09 11.91v1.7c0 2.94 0 4.41 0.57 5.54a5.25 5.25 0 0 0 2.3 2.3C5.09 22 6.56 22 9.5 22Z"></path>
</svg>`;

const PIN_ICON_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true" focusable="false" style="width:15px;height:15px;flex-shrink:0">
  <path stroke-linecap="round" stroke-linejoin="round" d="M8 14.67s5-4.33 5-8.34A5 5 0 0 0 3 6.33c0 4.01 5 8.34 5 8.34Z"></path>
  <circle cx="8" cy="6.33" r="1.83"></circle>
</svg>`;

function formatEventDateLabel(start: Date | null, end: Date | null): string {
  if (!start) return "Date TBA";
  const sameDay = end && start.toDateString() === end.toDateString();
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!end || sameDay) return fmt.format(start);
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(start);
    return `${monthShort} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatShortMonthDay(d: Date): { month: string; day: string } {
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(d).toUpperCase(),
    day: String(d.getDate()),
  };
}

/**
 * Renders a single event card using the theme's `card media-card media-card--card
 * media-card--overlap` skeleton (so spacing/rounding/aspect-ratio match Shop the Feed cards
 * exactly). The interior gets a date pill (top-left), calendar badge (top-right via the
 * theme's `.badges` slot), and a bottom overlay carrying date/title/location.
 */
function renderEventCard(event: StorefrontEventRow, index: number): string {
  const titleEsc = escapeHtml(event.title);
  const imgSrc = escapeAttr((event.image_url ?? "").trim() || PLACEHOLDER_IMAGE);
  const eventDate = event.event_date ?? null;
  const endDate = event.end_date ?? null;
  const dateLabelEsc = escapeHtml(formatEventDateLabel(eventDate, endDate));

  /**
   * Prefer the structured address fields (city/state) so the public card stays compact
   * — the full address line + ZIP is too long for the small overlay. We fall back to the
   * legacy `location` column for older rows that haven't been re-saved.
   */
  const cityState = [event.city?.trim(), event.state?.trim()].filter(Boolean).join(", ");
  const locationRaw = cityState || event.location?.trim() || event.venue?.trim() || "";
  const locationEsc = locationRaw ? escapeHtml(locationRaw) : "";
  const venueEsc = event.venue?.trim() && event.venue.trim() !== locationRaw
    ? escapeHtml(event.venue.trim())
    : "";
  const linkHref = event.link_url?.trim()
    ? escapeAttr(event.link_url.trim())
    : `/events/${escapeAttr(event.slug)}`;

  const datePill = eventDate
    ? (() => {
        const { month, day } = formatShortMonthDay(eventDate);
        return `<div class="pf-event-pill" aria-hidden="true"><span class="pf-event-pill__month">${escapeHtml(month)}</span><span class="pf-event-pill__day">${escapeHtml(day)}</span></div>`;
      })()
    : "";

  return `<div class="card media-card media-card--card media-card--overlap pf-event-card" id="pf-event-block-${index}">
  <a class="pf-event-card__link" href="${linkHref}" aria-label="${escapeAttr(event.title)}">
  <div class="product-card__media flex flex-col w-full h-full relative">
    <div class="media media--portrait relative overflow-hidden">
      <img src="${imgSrc}" alt="${escapeAttr(event.title)}" width="1600" height="1600" loading="lazy" sizes="(max-width: 639px) 100vw, (max-width: 767px) 74vw, 475px" class="loaded pf-event-card__image">
      ${datePill}
      <div class="pf-event-card__shade" aria-hidden="true"></div>
      <div class="badges absolute grid gap-3 pointer-events-none">${CALENDAR_ICON_SVG}</div>
      <div class="pf-event-card__overlay">
        <p class="pf-event-card__date"><time>${dateLabelEsc}</time></p>
        <h3 class="pf-event-card__title">${titleEsc}</h3>
        ${
          locationEsc
            ? `<p class="pf-event-card__loc"><span class="pf-event-card__loc-row">${PIN_ICON_SVG}<span>${locationEsc}${venueEsc ? ` · ${venueEsc}` : ""}</span></span></p>`
            : ""
        }
      </div>
    </div>
  </div>
  </a>
</div>`;
}

/**
 * Scoped overrides for the event-specific bits we layer onto the theme's `media-card--overlap`
 * skeleton: a top-left date pill, a bottom gradient + text overlay, and link styling. Everything
 * else (rounded corners, portrait aspect, the `.badges` slot in the top-right) is inherited
 * straight from the Concept theme.
 */
const EVENTS_SECTION_SCOPED_CSS = `<style data-pf-events-section>
  .pf-events-section .pf-event-card { position: relative; }
  .pf-events-section .pf-event-card__link { display: block; color: inherit; text-decoration: none; height: 100%; }
  .pf-events-section .pf-event-card__image { width: 100%; height: 100%; object-fit: cover; transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1); }
  .pf-events-section .pf-event-card__link:hover .pf-event-card__image { transform: scale(1.04); }

  .pf-events-section .pf-event-card .badges {
    top: 16px; right: 16px; left: auto;
    color: rgb(255 255 255);
    z-index: 2;
  }

  .pf-events-section .pf-event-pill {
    position: absolute; top: 16px; left: 16px; z-index: 3;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    width: 68px; height: 68px; border-radius: 16px;
    background: #ffffff; color: #111;
    box-shadow: 0 8px 20px rgba(0,0,0,0.22);
    line-height: 1;
  }
  .pf-events-section .pf-event-pill__month {
    font-size: 13px; font-weight: 700; letter-spacing: 0.08em; color: #ef4444; text-transform: uppercase;
  }
  .pf-events-section .pf-event-pill__day { font-size: 28px; font-weight: 700; margin-top: 4px; }

  .pf-events-section .pf-event-card__shade {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
    background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.30) 42%, rgba(0,0,0,0) 66%);
  }

  .pf-events-section .pf-event-card__overlay {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
    padding: 20px 22px 22px;
    color: #fff;
    display: flex; flex-direction: column; gap: 6px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.45);
  }
  .pf-events-section .pf-event-card__date {
    margin: 0; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.95; font-weight: 600;
  }
  .pf-events-section .pf-event-card__title {
    margin: 3px 0 0; font-size: 22px; font-weight: 700; line-height: 1.25;
  }
  @media (min-width: 1024px) { .pf-events-section .pf-event-card__title { font-size: 24px; } }
  .pf-events-section .pf-event-card__loc { margin: 6px 0 0; font-size: 15px; opacity: 0.95; }
  .pf-events-section .pf-event-card__loc-row { display: inline-flex; align-items: center; gap: 7px; }

  /* Right-side header chip — uses the theme's social-account skeleton, just our content. */
  .pf-events-section .pf-events-account__media {
    width: 56px; height: 56px;
    background: linear-gradient(135deg, #ef4444 0%, #f59e0b 100%);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.28);
  }
  .pf-events-section .pf-events-account__media svg { width: 26px; height: 26px; }
</style>`;

export type EventsSectionOptions = {
  /** Header right-side button target. */
  viewAllHref?: string;
  /** Headline shown left side. The first or last word becomes the scribble-underlined emphasis. */
  heading?: string;
  /** Optional supporting line under the headline. */
  subtitle?: string;
  /** Maximum number of cards rendered into the carousel track. Defaults to 12. */
  maxCards?: number;
};

/** Theme chevron icons reused by the Best Sellers carousel — keeps the slider controls visually identical. */
const CHEVRON_PREV_SVG = `<svg class="icon icon-chevron-left icon-md transform" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
  <path stroke-linecap="round" stroke-linejoin="round" d="M14 6L8 12L14 18"></path>
</svg>`;
const CHEVRON_NEXT_SVG = `<svg class="icon icon-chevron-right icon-md transform" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
  <path stroke-linecap="round" stroke-linejoin="round" d="M10 6L16 12L10 18"></path>
</svg>`;

/**
 * Splits "Upcoming Events" → ("Upcoming", "Events") so the theme's scribble underline can sit
 * under the emphasis word, just like "Shop the *Feed*".
 */
function splitHeadingForScribble(heading: string): { lead: string; emphasis: string } {
  const trimmed = heading.trim();
  if (!trimmed) return { lead: "", emphasis: "Events" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { lead: "", emphasis: parts[0] };
  const emphasis = parts.pop()!;
  return { lead: parts.join(" "), emphasis };
}

function renderEventsSectionHtml(events: StorefrontEventRow[], opts: EventsSectionOptions): string {
  const max = Math.max(1, Math.min(24, opts.maxCards ?? 12));
  const visible = events.slice(0, max);
  if (visible.length === 0) return "";

  const { lead, emphasis } = splitHeadingForScribble(opts.heading?.trim() || "Upcoming Events");
  const leadEsc = escapeHtml(lead);
  const emphasisEsc = escapeHtml(emphasis);
  const subtitleHtml = opts.subtitle?.trim()
    ? `<div class="description rte leading-normal subtext-md"><p>${escapeHtml(opts.subtitle.trim())}</p></div>`
    : "";

  const headingMarkup = lead
    ? `<h2 class="heading title-md">${leadEsc} <em is="highlighted-text" class="highlighted-text not-italic relative inline-block animated" data-style="scribble">${emphasisEsc}${SCRIBBLE_SVG}</em></h2>`
    : `<h2 class="heading title-md"><em is="highlighted-text" class="highlighted-text not-italic relative inline-block animated" data-style="scribble">${emphasisEsc}${SCRIBBLE_SVG}</em></h2>`;

  const viewAllChip = opts.viewAllHref
    ? `<div class="social-account flex items-center gap-6"><div class="social-account__media pf-events-account__media media media--rounded media--transparent relative overflow-hidden">${CALENDAR_ICON_SVG}</div><div class="grow md:grid flex items-center justify-between gap-2d5"><p class="heading subtext-lg leading-none">All events</p><p>
        <a class="button button--secondary button--sm" href="${escapeAttr(opts.viewAllHref)}" is="hover-link">
          <span class="btn-fill" data-fill=""></span>
          <span class="btn-text">View all</span>
        </a>
      </p></div></div>`
    : "";

  const cards = visible.map((e, i) => renderEventCard(e, i)).join("");

  /**
   * The slider markup mirrors `theme-concept-featured-collections.ts` (the "Best Sellers"
   * carousel) one-for-one — same `<slider-element class="grid slider slider--desktop slider--tablet"
   * selector=".card-grid>.card">` wrapper and same `is="previous-button" / is="next-button"`
   * controls — so the Concept theme's slider JS picks it up automatically with no extra glue.
   */
  const sliderId = "Slider-pf-events";
  const sliderControls = `<div class="indicators hidden lg:flex gap-2d5">
      <button class="button button--secondary" type="button" is="previous-button" aria-controls="${sliderId}" aria-label="Previous" disabled="">
        <span class="btn-fill" data-fill=""></span>
        <span class="btn-text">${CHEVRON_PREV_SVG}</span>
        <span class="btn-loader"><span></span><span></span><span></span></span>
      </button>
      <button class="button button--secondary" type="button" is="next-button" aria-controls="${sliderId}" aria-label="Next">
        <span class="btn-fill" data-fill=""></span>
        <span class="btn-text">${CHEVRON_NEXT_SVG}</span>
        <span class="btn-loader"><span></span><span></span><span></span></span>
      </button>
    </div>`;

  return `<div id="shopify-section-pf-events" class="shopify-section pf-events-shopify-section"><style>
  #shopify-section-pf-events { --section-padding-top: 80px; --section-padding-bottom: 100px; --color-background: 250 250 250; }
</style>
${EVENTS_SECTION_SCOPED_CSS}
<div class="section section--padding section--rounded relative pf-events-section" data-section-id="pf-events"><div class="page-width relative">
    <div class="title-wrapper leading-none gap-4 lg:gap-8 flex flex-col text-left md:items-end md:flex-row md:justify-between relative z-1"><div class="grid gap-4">${headingMarkup}${subtitleHtml}</div><div class="flex items-center gap-6">${viewAllChip}${sliderControls}</div></div>
  </div><div class="page-width relative">
    <slider-element id="${sliderId}" class="grid slider slider--desktop slider--tablet" selector=".card-grid>.card" tabindex="0">
      <div class="card-grid card-grid--4 mobile:card-grid--1 grid">${cards}</div>
    </slider-element>
  </div></div></div>`;
}

/**
 * Locate the Concept "Shop the Feed" section and replace its entire `<div id="shopify-section-...__shop-the-feed">…</div>`
 * wrapper with the Events HTML. Sections are siblings in this static export, so we slice up to the
 * next `<div id="shopify-section-`.
 */
export function applyConceptShopTheFeedEventsToHtml(
  html: string,
  events: StorefrontEventRow[],
  opts: EventsSectionOptions = {},
): string {
  if (events.length === 0) return html;

  const openRe = /<div\b[^>]*\bid="shopify-section-template[^"]*__shop-the-feed"[^>]*>/i;
  const m = html.match(openRe);
  if (!m || m.index === undefined) return html;

  const start = m.index;
  const after = start + m[0].length;
  const nextSiblingIdx = html.indexOf('<div id="shopify-section-', after);
  let end: number;
  if (nextSiblingIdx === -1) {
    const tail = html.lastIndexOf("</div>", html.length - 1);
    end = tail === -1 ? html.length : tail + "</div>".length;
  } else {
    end = nextSiblingIdx;
  }

  const replacement = renderEventsSectionHtml(events, opts);
  if (!replacement) return html;

  return html.slice(0, start) + replacement + html.slice(end);
}
