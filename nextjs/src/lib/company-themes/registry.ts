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

/** Crimson Consulting — static HTML Next.js export (from crimson-consulting-nextjs-template.zip). */
const CRIMSON_HTML_ROUTES: Record<string, string> = {
  "/": "index.html",
  "/about-us": "about-us/index.html",
  "/about-us/": "about-us/index.html",
  "/careers": "careers/index.html",
  "/careers/": "careers/index.html",
  "/contact-us": "contact-us/index.html",
  "/contact-us/": "contact-us/index.html",
  "/project-style-2": "project-style-2/index.html",
  "/project-style-2/": "project-style-2/index.html",
  "/services/background-checks": "services/background-checks/index.html",
  "/services/background-checks/": "services/background-checks/index.html",
  "/services/consulting": "services/consulting/index.html",
  "/services/consulting/": "services/consulting/index.html",
  "/services/deployable-security": "services/deployable-security/index.html",
  "/services/deployable-security/": "services/deployable-security/index.html",
  "/services/protective": "services/protective/index.html",
  "/services/protective/": "services/protective/index.html",
  "/services/transportation": "services/transportation/index.html",
  "/services/transportation/": "services/transportation/index.html",
};

const WIN_WITH_BARLOW_HTML_ROUTES: Record<string, string> = {
  "/": "index.html",
  "/about": "about/index.html",
  "/about/": "about/index.html",
  "/community": "community/index.html",
  "/community/": "community/index.html",
  "/contact": "contact/index.html",
  "/contact/": "contact/index.html",
  "/courses": "courses/index.html",
  "/courses/": "courses/index.html",
  "/course/1": "course/1/index.html",
  "/course/1/": "course/1/index.html",
  "/course/2": "course/2/index.html",
  "/course/2/": "course/2/index.html",
  "/course/3": "course/3/index.html",
  "/course/3/": "course/3/index.html",
  "/course/4": "course/4/index.html",
  "/course/4/": "course/4/index.html",
  "/course/5": "course/5/index.html",
  "/course/5/": "course/5/index.html",
  "/course/6": "course/6/index.html",
  "/course/6/": "course/6/index.html",
  "/course/7": "course/7/index.html",
  "/course/7/": "course/7/index.html",
  "/course/8": "course/8/index.html",
  "/course/8/": "course/8/index.html",
  "/course/9": "course/9/index.html",
  "/course/9/": "course/9/index.html",
  "/course/dot-study-hall": "course/dot-study-hall/index.html",
  "/course/dot-study-hall/": "course/dot-study-hall/index.html",
  "/workshops": "workshops/index.html",
  "/workshops/": "workshops/index.html",
  "/workshops/chicago-il": "workshops/chicago-il/index.html",
  "/workshops/chicago-il/": "workshops/chicago-il/index.html",
  "/workshops/indianapolis": "workshops/indianapolis/index.html",
  "/workshops/indianapolis/": "workshops/indianapolis/index.html",
  "/workshops/jackson-ms": "workshops/jackson-ms/index.html",
  "/workshops/jackson-ms/": "workshops/jackson-ms/index.html",
  "/workshops/las-vegas": "workshops/las-vegas/index.html",
  "/workshops/las-vegas/": "workshops/las-vegas/index.html",
};

export const COMPANY_NEXTJS_THEMES: CompanyNextjsTheme[] = [
  {
    slug: "crimson-consulting",
    name: "Crimson Consulting",
    description:
      "Security and consulting marketing theme with home, about, careers, contact, and multi-page services.",
    publicPath: "/company-themes/crimson-consulting",
    sitePathPrefix: "/company-website",
    htmlRoutes: CRIMSON_HTML_ROUTES,
    previewImage: "/company-themes/crimson-consulting/theme-thumbnail.png",
  },
  {
    slug: "win-with-barlow-securx",
    name: "Win With Barlow",
    description:
      "Diagnostic training marketing theme with courses, workshops, community, about, and contact pages.",
    publicPath: "/company-themes/win-with-barlow-securx",
    sitePathPrefix: "/company-website",
    htmlRoutes: WIN_WITH_BARLOW_HTML_ROUTES,
    previewImage: "/company-themes/win-with-barlow-securx/theme-thumbnail.png",
  },
];

export function getCompanyNextjsTheme(slug: string | null | undefined): CompanyNextjsTheme | null {
  const s = (slug ?? "").trim();
  if (!s) return null;
  return COMPANY_NEXTJS_THEMES.find((t) => t.slug === s) ?? null;
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
