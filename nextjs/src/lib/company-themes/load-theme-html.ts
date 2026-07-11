import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import type { CompanyNextjsTheme } from "@/lib/company-themes/registry";

export const PLANT_BINGO_BASH_DYNAMIC_EVENT_DETAIL_HTML = "events/_detail/index.html";

function normalizePathname(pathname: string): string {
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
}

function resolveHtmlFile(theme: CompanyNextjsTheme, pathname: string): string | null {
  const normalized = normalizePathname(pathname);

  if (theme.htmlRoutes[pathname]) return theme.htmlRoutes[pathname];
  if (theme.htmlRoutes[normalized]) return theme.htmlRoutes[normalized];
  if (theme.htmlRoutes[`${normalized}/`]) return theme.htmlRoutes[`${normalized}/`];

  if (theme.slug === "plant-bingo-bash" && normalized.startsWith("/events/")) {
    const eventSlug = normalized.slice("/events/".length);
    if (eventSlug) return PLANT_BINGO_BASH_DYNAMIC_EVENT_DETAIL_HTML;
  }

  return null;
}

export function hasStaticCompanyThemeHtmlRoute(theme: CompanyNextjsTheme, pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return !!(theme.htmlRoutes[pathname] || theme.htmlRoutes[normalized] || theme.htmlRoutes[`${normalized}/`]);
}

export function isDynamicCompanySiteEventDetailPath(theme: CompanyNextjsTheme, pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return theme.slug === "plant-bingo-bash" && normalized.startsWith("/events/") && normalized !== "/events";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Rewrite relative asset URLs and internal theme routes for hosting under sitePathPrefix. */
export function rewriteCompanyThemeHtml(html: string, theme: CompanyNextjsTheme): string {
  const assetPrefix = theme.publicPath.replace(/\/$/, "");
  const sitePrefix = theme.sitePathPrefix.replace(/\/$/, "");

  let output = html;

  output = output.replace(
    /((?:href|src|srcset)=["'])(?!https?:\/\/|\/\/|\/|#|mailto:|tel:|data:|javascript:)([^"']+)(["'])/gi,
    (_match, prefix: string, url: string, suffix: string) => {
      const cleaned = url.replace(/^\.\//, "");
      return `${prefix}${assetPrefix}/${cleaned}${suffix}`;
    },
  );

  output = output.replace(
    /((?:href|src)=["'])\/assets\/([^"']+)(["'])/gi,
    `$1${assetPrefix}/assets/$2$3`,
  );

  output = output.replace(
    /url\(\s*(['"]?)(?!https?:\/\/|\/\/|\/|data:)([^'")]+)\1\s*\)/gi,
    (_match, quote: string, url: string) =>
      `url(${quote}${assetPrefix}/${url.replace(/^\.\//, "")}${quote})`,
  );

  const routes = [...new Set(Object.keys(theme.htmlRoutes))].sort((a, b) => b.length - a.length);
  for (const route of routes) {
    if (route === "/") continue;
    const target = route.endsWith("/") ? route.slice(0, -1) : route;
    const re = new RegExp(`((?:href|action)=["'])${escapeRegex(target)}(/?)(["'#])`, "gi");
    output = output.replace(re, (_m, p1: string, slash: string, p3: string) => {
      return `${p1}${sitePrefix}${target}${slash}${p3}`;
    });
  }

  output = output.replace(/((?:href|src|action)=["'])\/(["'#])/gi, `$1${sitePrefix}/$2`);

  return output;
}

export function loadCompanyThemeHtml(theme: CompanyNextjsTheme, pathname: string): string | null {
  const relativeFile = resolveHtmlFile(theme, pathname);
  if (!relativeFile) return null;

  const diskRoot = join(process.cwd(), "public", theme.publicPath.replace(/^\//, ""));
  const filePath = join(diskRoot, relativeFile);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, "utf-8");
  return rewriteCompanyThemeHtml(raw, theme);
}

export function normalizeCompanyWebsitePathname(segments: string[] | undefined): string {
  if (!segments || segments.length === 0) return "/";
  return `/${segments.map((s) => decodeURIComponent(s)).join("/")}`;
}
