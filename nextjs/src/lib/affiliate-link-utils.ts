/** Build a trackable affiliate URL with ref, program, and link slug query params. */
export function buildAffiliateTrackingUrl(opts: {
  baseUrl: string;
  referralCode: string;
  programId: string;
  slug: string;
  destinationUrl?: string | null;
}): string {
  const raw = (opts.destinationUrl?.trim() || opts.baseUrl.trim()) || "";
  if (!raw) return "";

  try {
    const normalized = raw.includes("://") ? raw : `https://${raw}`;
    const url = new URL(normalized);
    url.searchParams.set("ref", opts.referralCode);
    url.searchParams.set("program", opts.programId);
    url.searchParams.set("aff", opts.slug);
    return url.toString();
  } catch {
    return "";
  }
}

/** Short redirect URL served by this app (increments clicks, then redirects to trackingUrl). */
export function buildAffiliateRedirectUrl(linkId: string, appOrigin?: string): string {
  const origin =
    appOrigin?.trim() ||
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_URL?.trim() : "") ||
    "http://localhost:5000";
  const base = origin.replace(/\/$/, "");
  return `${base}/api/affiliate/go/${linkId}`;
}

export function slugifyAffiliateLink(partnerCode: string, programName: string, programId: string): string {
  const code = partnerCode.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const prog = programName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = programId.slice(-4);
  return `${code}-${prog || "program"}-${suffix}`.slice(0, 64);
}

export const DEFAULT_AFFILIATE_LANDING_URL = "https://paperflight.demo";
