import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type CompanyNextjsTheme = {
  slug: string;
  name: string;
  description: string;
  /** Static files live under `public/company-themes/{slug}/` */
  publicPath: string;
  /** URL prefix for serving pages (e.g. /company-website) */
  sitePathPrefix: string;
  htmlRoutes: Record<string, string>;
  previewImage?: string;
};

const LEGACY_THEME_SLUGS: Record<string, string> = {
  "crimson-consulting": "plant-bingo-bash",
  "win-with-barlow-securx": "plant-bingo-bash",
};

const PLANT_BINGO_BASH_FALLBACK_ROUTES: Record<string, string> = {
  "/": "index.html",
  "/about": "about/index.html",
  "/about/": "about/index.html",
  "/events": "events/index.html",
  "/events/": "events/index.html",
  "/contact": "contact/index.html",
  "/contact/": "contact/index.html",
  "/how-it-works": "how-it-works/index.html",
  "/how-it-works/": "how-it-works/index.html",
  "/community": "community/index.html",
  "/community/": "community/index.html",
};

function loadPlantBingoBashHtmlRoutes(): Record<string, string> {
  const manifestPath = join(
    process.cwd(),
    "public",
    "company-themes",
    "plant-bingo-bash",
    "theme-routes.json",
  );
  if (!existsSync(manifestPath)) return PLANT_BINGO_BASH_FALLBACK_ROUTES;
  try {
    const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as { htmlRoutes?: Record<string, string> };
    return raw.htmlRoutes && Object.keys(raw.htmlRoutes).length > 0
      ? raw.htmlRoutes
      : PLANT_BINGO_BASH_FALLBACK_ROUTES;
  } catch {
    return PLANT_BINGO_BASH_FALLBACK_ROUTES;
  }
}

const PLANT_BINGO_BASH_THEME: CompanyNextjsTheme = {
  slug: "plant-bingo-bash",
  name: "Plant Bingo Bash",
  description:
    "Greenhouse Bingo marketing theme with events, ticketing, community, host signup, and business pages.",
  publicPath: "/company-themes/plant-bingo-bash",
  sitePathPrefix: "/company-website",
  htmlRoutes: PLANT_BINGO_BASH_FALLBACK_ROUTES,
  previewImage: "/company-themes/plant-bingo-bash/theme-thumbnail.png",
};

export const COMPANY_NEXTJS_THEMES: CompanyNextjsTheme[] = [PLANT_BINGO_BASH_THEME];

export function resolveCompanyThemeSlug(slug: string | null | undefined): string {
  const s = (slug ?? "").trim();
  if (!s) return "";
  return LEGACY_THEME_SLUGS[s] ?? s;
}

export function getCompanyNextjsTheme(slug: string | null | undefined): CompanyNextjsTheme | null {
  const resolved = resolveCompanyThemeSlug(slug);
  if (!resolved) return null;
  const base = COMPANY_NEXTJS_THEMES.find((t) => t.slug === resolved) ?? null;
  if (!base) return null;
  if (base.slug === "plant-bingo-bash") {
    return { ...base, htmlRoutes: loadPlantBingoBashHtmlRoutes() };
  }
  return base;
}

export function listCompanyNextjsThemeOptions() {
  return COMPANY_NEXTJS_THEMES.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    previewImage: t.previewImage ?? null,
    previewUrl: t.sitePathPrefix,
    previewPageUrl: `${t.publicPath}/index.html`,
  }));
}
