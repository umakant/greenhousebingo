/**
 * Hostname for `findDomainByHostname` / `shop.domain` (no port).
 * Handles `Host: localhost:5000`, bracketed IPv6, and leaves bare hostnames unchanged.
 */
export function storefrontHostnameForLookup(hostHeader: string): string {
  const t = hostHeader.trim().toLowerCase();
  if (!t) return "";
  if (t.startsWith("[")) {
    const end = t.indexOf("]");
    return end === -1 ? t : t.slice(1, end);
  }
  const lastColon = t.lastIndexOf(":");
  if (lastColon > 0) {
    const tail = t.slice(lastColon + 1);
    if (/^\d{1,5}$/.test(tail)) {
      return t.slice(0, lastColon);
    }
  }
  return t;
}

/** `host[:port]` from the request, lowercased — use when building `http(s)://…` absolute URLs (theme assets, `shop.url`). */
export function storefrontAuthorityForUrls(hostHeader: string): string {
  return hostHeader.trim().toLowerCase();
}
