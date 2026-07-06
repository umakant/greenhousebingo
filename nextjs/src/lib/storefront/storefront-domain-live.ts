/** Domain + website must be active before serving the public shop on a custom hostname. */
export function isLiveStorefrontDomain(
  domain:
    | {
        status: string;
        website: { status: string } | null;
      }
    | null
    | undefined,
): boolean {
  if (!domain?.website) return false;
  const domainStatus = domain.status.trim().toLowerCase();
  if (domainStatus !== "active" && domainStatus !== "verified") return false;
  const websiteStatus = domain.website.status.trim().toLowerCase();
  return websiteStatus === "active" || websiteStatus === "published";
}
