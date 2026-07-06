import type { NextConfig } from "next";
import path from "node:path";

/**
 * App routes live at /dashboard, /settings, … without a locale prefix. A fake first
 * segment (e.g. /en/dashboard) hits [...path] and shows "Placeholder page".
 */
const KNOWN_UI_LOCALES = [
  "en",
  "es",
  "ar",
  "da",
  "de",
  "fr",
  "he",
  "it",
  "ja",
  "nl",
  "pl",
  "pt",
  "ru",
  "tr",
  "zh",
  "pt-BR",
] as const;

const LOCALE_PREFIX_REDIRECTS: { source: string; destination: string; permanent: boolean }[] =
  KNOWN_UI_LOCALES.flatMap((locale) => [
    { source: `/${locale}/dashboards/:path*`, destination: "/dashboard", permanent: false },
    { source: `/${locale}/dashboard`, destination: "/dashboard", permanent: false },
    { source: `/${locale}/dashboard/:path*`, destination: "/dashboard", permanent: false },
  ]);

const nextConfig: NextConfig = {
  /** Avoid framework redirects to `http://0.0.0.0:…` when dev binds to all interfaces. */
  skipTrailingSlashRedirect: true,
  turbopack: {
    // Fix monorepo root inference (multiple lockfiles in repo).
    root: path.join(__dirname),
  },
  /**
   * Server Actions body size. Route handlers (e.g. theme image upload) are still capped by nginx
   * `client_max_body_size` in production — see `deploy/nextjs.nginx.example`.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async redirects() {
    return [
      ...LOCALE_PREFIX_REDIRECTS,
      /** Theme ZIPs / Shopify often emit `theme_assets`; our route lives at `theme-assets`. */
      { source: "/shop/theme_assets/:path*", destination: "/shop/theme-assets/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
