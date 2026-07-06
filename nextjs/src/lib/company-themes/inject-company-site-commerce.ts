import type { CompanyNextjsTheme } from "@/lib/company-themes/registry";
import { WIN_WITH_BARLOW_CATALOG } from "@/lib/company-themes/win-with-barlow-catalog";

export function injectCompanySiteCommerce(
  html: string,
  theme: CompanyNextjsTheme,
  companySlug: string,
): string {
  const assetPrefix = theme.publicPath.replace(/\/$/, "");
  const sitePrefix = theme.sitePathPrefix.replace(/\/$/, "") || "";
  const catalog =
    theme.slug === "win-with-barlow-securx"
      ? WIN_WITH_BARLOW_CATALOG.map(({ id, type, slug, title, price, currency, path }) => ({
          id,
          type,
          slug,
          title,
          price,
          currency,
          path,
        }))
      : [];
  const config = JSON.stringify({
    companySlug,
    sitePrefix,
    assetPrefix,
    catalog,
  });

  const snippet = `<link rel="stylesheet" href="${assetPrefix}/assets/company-site-commerce.css" /><script>window.__COMPANY_SITE__=${config};</script><script src="${assetPrefix}/assets/company-site-commerce.js" defer></script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${snippet}</body>`);
  }
  return `${html}${snippet}`;
}
