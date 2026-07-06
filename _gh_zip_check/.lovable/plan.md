This is a large multi-surface build. I'll scope it into phases so we can ship a strong foundation first, then layer on dashboards and backend.

## Phase 1 — Public marketing site + event marketplace (this build)

Design system (botanical/greenhouse theme):
- Warm greens, cream, terracotta accents; serif display font paired with clean sans body
- All tokens in `src/styles.css` (oklch), custom shadcn variants for buttons/cards
- Reusable components: `EventCard`, `CompanyCard`, `PricingCard`, `SectionHeading`, `SearchBar`, `Filters`

Routes (TanStack Start, each with its own head() metadata):
- `/` — Hero, search, featured events, featured companies, how it works, dual CTAs (Find Events / Become a Rep), newsletter
- `/events` — All events grid with filters (city, state, date, venue, company, price, 21+, family)
- `/events/$eventId` — Full event detail, venue, map placeholder, QR, buy CTA
- `/companies` — Directory of approved companies
- `/companies/$companySlug` — Branded company page, only their events
- `/become-a-rep` — Opportunity pitch + plan comparison + apply CTA
- `/pricing` — Starter / Growth / Pro / Enterprise plan cards
- `/venues` — Venue partner pitch + lead form
- `/about` — Story, plant bingo concept
- `/contact` — Contact form with inquiry-type selector
- `/auth` — Login + signup (tabs), account-type selector on signup

Placeholder data:
- `src/data/events.ts`, `src/data/companies.ts`, `src/data/venues.ts` — typed mock data so all pages render realistically. Includes "The Social Greenhouse" and a couple other reps across cities.
- Ready to swap for Lovable Cloud queries later.

Sitemap + robots + root SEO metadata updated.

## Phase 2 — Dashboards (next build)
- `/account` — customer: tickets, upcoming, past, saved, profile
- `/rep/dashboard` — overview, events (with builder), venues, tickets/orders, check-in, QR codes, flyer generator, customers, subscription, settings
- `/admin` — overview, companies, customers, venues, events, tickets, subscriptions, revenue, featured events, support

## Phase 3 — Backend (Lovable Cloud)
- Auth (email + Google), user roles table (customer/rep/admin) with `has_role` RPC
- Tables: companies, venues, events, tickets, orders, subscriptions, featured_events
- RLS: reps manage their own company data; customers see their own tickets; admins see all
- Server functions for ticket purchase, check-in, QR generation

## Phase 4 — Payments
- Stripe (managed) for ticket checkout and rep subscription plans

## Technical notes
- File-based routes under `src/routes/` with dot-separated names (`events.$eventId.tsx`, `companies.$companySlug.tsx`)
- Each shareable route sets its own title/description/og in `head()`
- Every route has `errorComponent` + `notFoundComponent`
- Layout: shared `<SiteHeader>` + `<SiteFooter>` composed in `__root.tsx` around `<Outlet />`
- Dashboards will use TanStack Router's `_authenticated` layout once auth ships

## Proposal
I'll execute Phase 1 now (public site + marketplace with realistic mock data and full design system). Once you like the look and feel, I'll ship Phase 2 (dashboards), then wire Cloud auth + database, then Stripe.

Reply "go" to start Phase 1, or tell me if you'd rather start somewhere else (e.g. dashboards first, or enable Cloud immediately).