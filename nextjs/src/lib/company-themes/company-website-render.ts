import "server-only";

import { applyCompanyThemeCustomizations } from "@/lib/company-themes/apply-customizations";
import { getCompanyThemeCustomizerSchema } from "@/lib/company-themes/customizer-schema";
import { getCustomizerValuesForSlug } from "@/lib/company-themes/customizer-service";
import { getCompanyWebsiteSettingsForOwnerId } from "@/lib/company-themes/company-website-settings";
import { findCompanyPublicSlugByOwnerId } from "@/lib/company-themes/company-website-host-resolver";
import { injectCompanySiteCommerce } from "@/lib/company-themes/inject-company-site-commerce";
import { loadCompanyThemeHtml } from "@/lib/company-themes/load-theme-html";
import { getCompanyNextjsTheme, type CompanyNextjsTheme } from "@/lib/company-themes/registry";
import {
  extractCompanyWebsiteChrome,
  type CompanyWebsiteChrome,
} from "@/lib/company-themes/company-theme-chrome";

export type CompanyWebsiteRenderResult =
  | { ok: true; html: string; cacheControl: string }
  | { ok: false; status: number; html: string };

function noThemeHtml(): string {
  return `<!doctype html><html><body style="font-family:system-ui;padding:2rem"><h1>No theme selected</h1><p>Choose a marketing theme under Settings → Company Website Theme.</p><p><a href="/settings?tab=company-website-theme">Open Company Website Theme settings</a></p></body></html>`;
}

function unavailableHtml(): string {
  return `<!doctype html><html><body style="font-family:system-ui;padding:2rem"><h1>Company website unavailable</h1><p>This marketing site is only available for individual company accounts.</p></body></html>`;
}

export async function renderCompanyWebsitePage(
  ownerId: bigint,
  pathname: string,
  sitePathPrefix: string,
  options?: { privateCache?: boolean },
): Promise<CompanyWebsiteRenderResult> {
  const companyWebsite = await getCompanyWebsiteSettingsForOwnerId(ownerId);
  const themeSlug = companyWebsite.slug.trim();
  const baseTheme = getCompanyNextjsTheme(themeSlug);
  if (!baseTheme) {
    return { ok: false, status: 200, html: noThemeHtml() };
  }

  const theme: CompanyNextjsTheme = {
    ...baseTheme,
    sitePathPrefix: sitePathPrefix || baseTheme.sitePathPrefix,
  };

  const html = loadCompanyThemeHtml(theme, pathname);
  if (!html) {
    return {
      ok: false,
      status: 404,
      html: `<!doctype html><html><body style="font-family:system-ui;padding:2rem"><h1>Page not found</h1><p><a href="${sitePathPrefix || "/"}">Home</a></p></body></html>`,
    };
  }

  let output = html;
  const schema = getCompanyThemeCustomizerSchema(theme.slug);
  if (schema) {
    const values = getCustomizerValuesForSlug(theme.slug, companyWebsite.customizerRaw);
    output = applyCompanyThemeCustomizations(html, schema.fields, values, pathname);
  }

  if (theme.slug === "win-with-barlow-securx") {
    const slugFromPrefix = sitePathPrefix.match(/^\/sites\/([^/]+)/i)?.[1];
    const companySlug =
      (slugFromPrefix ? decodeURIComponent(slugFromPrefix) : null) ??
      (await findCompanyPublicSlugByOwnerId(ownerId));
    if (companySlug) {
      output = injectCompanySiteCommerce(output, theme, companySlug);
    }
  }

  return {
    ok: true,
    html: output,
    cacheControl: options?.privateCache ? "private, max-age=0, must-revalidate" : "public, max-age=60, s-maxage=300",
  };
}

/** Header + footer from the company homepage (for cart/checkout shells). */
export async function renderCompanyWebsiteChrome(
  ownerId: bigint,
  sitePathPrefix: string,
): Promise<CompanyWebsiteChrome | null> {
  const result = await renderCompanyWebsitePage(ownerId, "/", sitePathPrefix);
  if (!result.ok) return null;

  const companyWebsite = await getCompanyWebsiteSettingsForOwnerId(ownerId);
  const baseTheme = getCompanyNextjsTheme(companyWebsite.slug.trim());
  if (!baseTheme) return null;

  const extracted = extractCompanyWebsiteChrome(result.html, baseTheme.publicPath);
  if (!extracted) return null;

  return {
    ...extracted,
    themeSlug: baseTheme.slug,
  };
}
