/** Normalize a website or domain input to a full https URL for storage and links. */
export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** Hostname only (no protocol/path) for display or DNS hints. */
export function websiteUrlToHostname(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    return new URL(normalizeWebsiteUrl(trimmed)).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0] ?? "";
  }
}

/** In-app public marketing site path (no sign-in) or external domain when configured. */
export function resolveCompanyDefaultSitePath(company_slug?: string): string {
  const slug = (company_slug ?? "").trim();
  if (slug) return `/sites/${encodeURIComponent(slug)}`;
  return "/company-website";
}

/** In-app public marketing site path (no sign-in) or external domain when configured. */
export function resolveCompanyPublicSiteHref(settings: {
  companyWebsite?: string;
  company_slug?: string;
}): string {
  const external = (settings.companyWebsite ?? "").trim();
  if (external) return normalizeWebsiteUrl(external);
  return resolveCompanyDefaultSitePath(settings.company_slug);
}

/** DNS target for company marketing domains (display in Settings). */
export function companyWebsiteDnsTargetForDisplay(): string {
  const explicit = (process.env.NEXT_PUBLIC_COMPANY_WEBSITE_DNS_TARGET ?? "").trim();
  if (explicit) {
    return explicit.replace(/^https?:\/\//, "").split("/")[0]!.replace(/:\d+$/, "");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  try {
    if (appUrl) return new URL(appUrl).hostname;
  } catch {
    /* ignore */
  }
  return "nextjs.paperflight.cc";
}

/** Visit Site target — external domain when set, otherwise public /sites/{slug} preview. */
export function resolveCompanyVisitSiteHref(settings: {
  companyWebsite?: string;
  company_slug?: string;
}): string {
  const external = (settings.companyWebsite ?? "").trim();
  if (external) return normalizeWebsiteUrl(external);
  return resolveCompanyPublicSiteHref(settings);
}
