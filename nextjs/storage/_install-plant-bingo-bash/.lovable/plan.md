# Responsive Optimization Pass

Goal: every page renders cleanly on mobile (375px), tablet (768px), and desktop (1280px+) with no horizontal scroll, no clipped text, no overlapping controls, and proper touch-target sizing. HTML remains semantic HTML5.

## Approach

1. **Automated audit** — drive Playwright at 375 / 768 / 1280 across every public route (`/`, `/events`, `/events/:slug`, `/how-it-works`, `/host-event`, `/start-business`, `/community`, `/about`, `/contact`, `/pricing`, `/calendar`, `/cities`, `/states`, `/buy-tickets`, `/login`, `/account`, `/privacy`, `/terms`, `/refund`, `/partner/dashboard`, `/venue/dashboard`). Capture element screenshots + measure `documentElement.scrollWidth > innerWidth` and log offending nodes.

2. **Global fixes** (touch once, benefits every page):
   - `src/routes/__root.tsx` — confirm `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, add `overflow-x-hidden` safety on `body`.
   - `src/components/site-nav.tsx` — verify mobile menu, hamburger, sticky header spacing, and that logo + CTA don't wrap oddly at 375px.
   - `src/components/site-footer.tsx` — stack columns cleanly on mobile.
   - `src/styles.css` — add utility guards: `img,svg,video{max-width:100%;height:auto}`, `overflow-wrap: anywhere` on long strings, safe-area padding on sticky bars.

3. **Per-page fixes** — apply the responsive-layout pattern (grid + min-w-0 + shrink-0 + truncate) to headers, cards, tables, and pricing rows. Common expected fixes:
   - Large hero headings: add clamp-style responsive sizing (`text-4xl sm:text-5xl lg:text-7xl`).
   - Multi-column grids: ensure `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`.
   - Sticky filter bars (events index): make sure they don't overflow the viewport.
   - Long legal pages (privacy/terms/refund): confirm prose width and side padding.
   - Dashboards: tables → cards or `overflow-x-auto` wrappers.
   - Calculator inputs on `/start-business`: stack sliders on mobile.
   - `/events/:slug` seating/ticket UI: single-column on mobile.

4. **Verification** — re-run the same audit script; every route must report zero horizontal-overflow and pass a visual sanity screenshot at all three widths.

## Technical details

- Tailwind v4 breakpoints: `sm:640` `md:768` `lg:1024` `xl:1280`.
- Responsive pattern: `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between` for header rows with a widget on the right; `min-w-0` + `truncate` on text; `shrink-0` on icons.
- HTML5 semantics check: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>` present; single `<h1>` per route; alt text on all `<img>`.
- No changes to business logic, data, routes, or copy — presentation only.

## Out of scope

- Redesigns, new features, new pages.
- Native app / PWA install flow (not requested).
- Accessibility beyond what falls out of semantic HTML + touch targets.

## Deliverable

Commit-ready edits across `__root.tsx`, `styles.css`, `site-nav.tsx`, `site-footer.tsx`, and any route file the audit flags, plus a short summary of what was changed per page.
