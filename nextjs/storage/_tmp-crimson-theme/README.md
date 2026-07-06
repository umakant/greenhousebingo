# Crimson Consulting — Next.js Theme Template

Marketing site theme (security / consulting layout) packaged for **Next.js 14+**.  
Use it as a starting point in any new project.

## What's included

- Full static theme assets (`public/`) — CSS, images, Elementor/WordPress export
- All main pages wired through Next.js middleware
- Raw HTML rendering so sliders, menus, and scripts work as in the original site

## Pages

| Route | Page |
|-------|------|
| `/` | Home |
| `/about-us` | About Us |
| `/careers` | Careers |
| `/contact-us` | Contact |
| `/project-style-2` | Projects |
| `/services/background-checks` | Background Checks |
| `/services/consulting` | Consulting |
| `/services/deployable-security` | Deployable Security |
| `/services/protective` | Protective |
| `/services/transportation` | Transportation |

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production

```bash
npm run build
npm start
```

## Customize

1. **Branding / copy** — edit HTML under `public/` (e.g. `public/index.html`, `public/about-us/index.html`).
2. **New page** — add HTML under `public/your-page/index.html`, then register the route in `lib/static-html.ts` and `middleware.ts` matcher.
3. **React migration** — replace middleware HTML serving with App Router pages and rebuild sections as React components over time.

## How it works

- `middleware.ts` rewrites marketing URLs to `/api/html?path=...`
- `app/api/html/route.ts` loads the matching file from `public/` and returns full HTML
- Assets (`/content`, `/assets`, etc.) are served directly from `public/`

## License

Theme assets are from the Crimson Consulting marketing site. Use and modify for your own projects as needed.
