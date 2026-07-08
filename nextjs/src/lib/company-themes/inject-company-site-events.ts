import type { CompanyNextjsTheme } from "@/lib/company-themes/registry";
import type { CompanySiteEventCard, CompanySiteEventDetail } from "@/lib/company-themes/company-site-events-types";

export type CompanySiteEventsInjectOptions = {
  companySlug: string;
  sitePathPrefix: string;
  pathname: string;
  bootstrap?: {
    list?: { events: CompanySiteEventCard[]; total: number; stateCount: number };
    detail?: CompanySiteEventDetail;
    eventSlug?: string;
  };
};

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function injectCompanySiteEvents(
  html: string,
  theme: CompanyNextjsTheme,
  options: CompanySiteEventsInjectOptions,
): string {
  if (theme.slug !== "plant-bingo-bash") return html;

  const assetPrefix = theme.publicPath.replace(/\/$/, "");
  const sitePrefix = options.sitePathPrefix.replace(/\/$/, "") || "";
  const config = {
    companySlug: options.companySlug,
    sitePrefix,
    pathname: options.pathname,
    apiBase: `/api/company-sites/${encodeURIComponent(options.companySlug)}/events`,
    bootstrap: options.bootstrap ?? null,
  };

  const snippet = `<script id="pbs-company-site-events-config" type="application/json">${escapeJsonForScript(config)}</script><script src="${assetPrefix}/assets/company-site-events.js" defer></script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${snippet}</body>`);
  }
  return `${html}${snippet}`;
}
