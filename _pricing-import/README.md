# Paper Flight — Pricing Page (Next.js App Router)

Drop-in pricing page for an existing Next.js app that already has the home page
port installed (SiteHeader, SiteFooter, lib/utils, Tailwind v4 tokens, etc.).

## Files

```
app/pricing/page.tsx                    # server component, exports metadata
components/pricing/PricingContent.tsx   # "use client" page body
components/pricing/CompareTable.tsx
components/pricing/PriceCalculator.tsx  # uses useState (client)
components/pricing/LearnMoreLink.tsx    # uses HoverCard
components/pricing/learnMoreContent.ts
components/ui/hover-card.tsx            # shadcn HoverCard primitive
```

Copy each file to the same path in your Next.js project. The page renders at `/pricing`.

## Install dependencies

```bash
npm install @radix-ui/react-hover-card lucide-react clsx tailwind-merge
```

`lucide-react`, `clsx`, `tailwind-merge` were already installed by the home
page port — re-running `npm install` is harmless.

## Prerequisites (from the home page port — verify they exist)

- `components/SiteHeader.tsx`
- `components/SiteFooter.tsx`
- `lib/utils.ts` exporting `cn()`
- `@/*` path alias in `tsconfig.json`
- Tailwind v4 with the design tokens (`--background`, `--foreground`, `--brand`,
  `--brand-foreground`, `--border`, `--card`, `--muted`, `--muted-foreground`,
  `--popover`, `--popover-foreground`) defined in `app/globals.css`

## What was changed vs. the TanStack source

- Removed `createFileRoute` and `Route.head()`; metadata is now exported from
  `app/pricing/page.tsx` per Next.js App Router conventions.
- Split into a server `page.tsx` (for `metadata`) + a `"use client"`
  `PricingContent.tsx` (needed because `PriceCalculator` uses `useState` and
  `LearnMoreLink` uses Radix HoverCard).
- No other behavior or styling changes.

## Verify

```bash
npm run dev
# open http://localhost:3000/pricing
```

You should see the hero, three plan cards, the "See Larger Plans" calculator,
the full compare table with sticky header, and the FAQ — identical to the
Lovable preview.
