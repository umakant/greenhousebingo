# Paper Flight Home Page — Next.js Port

Drop these files into your existing Next.js (App Router) project.

## File placement

```
your-next-app/
├── app/
│   ├── page.tsx                <- from app/page.tsx (this is your new home page)
│   └── globals.css             <- merge the contents of styles/globals.css here
├── components/
│   ├── SiteHeader.tsx
│   ├── SiteFooter.tsx
│   ├── HeroLottie.tsx
│   ├── FeatureGridSection.tsx
│   ├── EverythingYouNeedSection.tsx
│   ├── IndustriesSection.tsx
│   ├── StorySection.tsx
│   ├── TestimonialsSection.tsx
│   ├── CtaSection.tsx
│   └── nav/   (entire folder)
└── public/
    └── assets/   (entire folder of images + paperflight-hero.json)
```

Delete the existing `app/page.tsx` (or back it up) before copying.

## 1. Install dependencies

```bash
npm install lucide-react lottie-react
```

You also need Tailwind CSS v4 set up. If your project still uses Tailwind v3,
you'll need to convert the `@theme` / `oklch` tokens in `styles/globals.css`
into your `tailwind.config.js`. With Tailwind v4 it works as-is.

## 2. Path alias

Confirm `tsconfig.json` has:
```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

## 3. Add the `"use client"` directive

`app/page.tsx` already starts with `"use client";` because the components use
React hooks, Lottie, and form handlers. Keep it.

## 4. Fonts (optional but recommended)

The hero uses the default sans-serif font stack. If you want to match the
original Inter look, add to `app/layout.tsx`:
```tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
// then: <body className={inter.className}>
```

## 5. Global CSS

Copy `styles/globals.css` into your `app/globals.css` (or merge the
`:root`, `.dark`, `@theme inline`, and `@layer base` blocks). Make sure
`app/layout.tsx` imports it: `import "./globals.css";`.

## What was changed vs. the original

- `@tanstack/react-router` `<Link to=...>` → `next/link` `<Link href=...>`
- Removed TanStack `activeProps`
- Image imports `@/assets/*.png|jpg` → string paths `/assets/*` (Next.js
  serves anything in `/public` from the root URL)
- The Lottie JSON is imported relatively from `../public/assets/paperflight-hero.json`
- Removed TanStack `createFileRoute` wrapper; the page is a default-exported
  React component as required by the App Router

## Notes

- `components/ui/` is empty — the hero doesn't use any shadcn primitives, so
  you can ignore that folder.
- If you don't have `@/lib/utils`, the included `lib/utils.ts` provides the
  `cn()` helper used by some components (it requires `clsx` and
  `tailwind-merge`: `npm i clsx tailwind-merge`).
