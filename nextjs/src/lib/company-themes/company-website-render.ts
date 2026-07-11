import "server-only";

import { applyCompanyThemeCustomizations } from "@/lib/company-themes/apply-customizations";
import { getCompanyThemeCustomizerSchema } from "@/lib/company-themes/customizer-schema";
import { getCustomizerValuesForSlug } from "@/lib/company-themes/customizer-service";
import {
  getCompanySiteEventByPublicSlug,
  listCompanySiteEvents,
} from "@/lib/company-themes/company-site-events-service";
import { getCompanyWebsiteSettingsForOwnerId } from "@/lib/company-themes/company-website-settings";
import { injectCompanySiteEvents } from "@/lib/company-themes/inject-company-site-events";
import {
  hasStaticCompanyThemeHtmlRoute,
  isDynamicCompanySiteEventDetailPath,
  loadCompanyThemeHtml,
} from "@/lib/company-themes/load-theme-html";
import { findCompanyPublicSlugByOwnerId } from "@/lib/company-themes/company-website-host-resolver";
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

function pageNotFoundHtml(sitePathPrefix: string): string {
  return `<!doctype html><html><body style="font-family:system-ui;padding:2rem"><h1>Page not found</h1><p><a href="${sitePathPrefix || "/"}">Home</a></p></body></html>`;
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

  let preloadedEventDetail: Awaited<ReturnType<typeof getCompanySiteEventByPublicSlug>> | undefined;
  if (isDynamicCompanySiteEventDetailPath(theme, pathname) && !hasStaticCompanyThemeHtmlRoute(theme, pathname)) {
    const eventSlug = pathname.replace(/^\/events\//, "").replace(/\/$/, "");
    if (eventSlug) {
      preloadedEventDetail = await getCompanySiteEventByPublicSlug(ownerId, eventSlug);
      if (!preloadedEventDetail) {
        return { ok: false, status: 404, html: pageNotFoundHtml(sitePathPrefix) };
      }
    }
  }

  const html = loadCompanyThemeHtml(theme, pathname);
  if (!html) {
    return {
      ok: false,
      status: 404,
      html: pageNotFoundHtml(sitePathPrefix),
    };
  }

  let output = html;
  const schema = getCompanyThemeCustomizerSchema(theme.slug);
  if (schema) {
    const values = getCustomizerValuesForSlug(theme.slug, companyWebsite.customizerRaw);
    output = applyCompanyThemeCustomizations(html, schema.fields, values, pathname);
  }

  if (theme.slug === "plant-bingo-bash") {
    const companySlug = (await findCompanyPublicSlugByOwnerId(ownerId)) ?? "";
    const bootstrap: {
      list?: Awaited<ReturnType<typeof listCompanySiteEvents>>;
      detail?: Awaited<ReturnType<typeof getCompanySiteEventByPublicSlug>>;
      eventSlug?: string;
    } = {};

    if (pathname === "/events" || pathname === "/events/") {
      const list = await listCompanySiteEvents(ownerId);
      bootstrap.list = list;
    } else if (pathname.startsWith("/events/")) {
      const eventSlug = pathname.replace(/^\/events\//, "").replace(/\/$/, "");
      if (eventSlug) {
        const detail =
          preloadedEventDetail ?? (await getCompanySiteEventByPublicSlug(ownerId, eventSlug));
        if (detail) {
          bootstrap.detail = detail;
          bootstrap.eventSlug = eventSlug;
        }
      }
    } else if (pathname === "/") {
      const list = await listCompanySiteEvents(ownerId);
      bootstrap.list = list;
    }

    output = injectCompanySiteEvents(output, theme, {
      companySlug,
      sitePathPrefix: sitePathPrefix || theme.sitePathPrefix,
      pathname,
      bootstrap: {
        list: bootstrap.list
          ? {
              events: bootstrap.list.events,
              total: bootstrap.list.total,
              stateCount: bootstrap.list.stateCount,
            }
          : undefined,
        detail: bootstrap.detail ?? undefined,
        eventSlug: bootstrap.eventSlug,
      },
    });
  }

  const isDynamicEventsPage =
    theme.slug === "plant-bingo-bash" &&
    (pathname === "/" || pathname === "/events" || pathname === "/events/" || pathname.startsWith("/events/"));

  return {
    ok: true,
    html: output,
    cacheControl: options?.privateCache
      ? "private, max-age=0, must-revalidate"
      : isDynamicEventsPage
        ? "public, max-age=0, s-maxage=30, stale-while-revalidate=60"
        : "public, max-age=60, s-maxage=300",
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
