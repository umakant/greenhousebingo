import { PLANT_BINGO_BASH_HTML_ROUTES } from "@/lib/company-themes/plant-bingo-bash-html-routes";

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
  "DN-0001-CO-26": "plant-bingo-bash",
};

const PLANT_BINGO_BASH_THEME: CompanyNextjsTheme = {
  slug: "plant-bingo-bash",
  name: "Plant Bingo Bash",
  description:
    "Greenhouse Bingo marketing theme with events, ticketing, community, host signup, and business pages.",
  publicPath: "/company-themes/plant-bingo-bash",
  sitePathPrefix: "/company-website",
  htmlRoutes: PLANT_BINGO_BASH_HTML_ROUTES,
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
  return COMPANY_NEXTJS_THEMES.find((t) => t.slug === resolved) ?? null;
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
