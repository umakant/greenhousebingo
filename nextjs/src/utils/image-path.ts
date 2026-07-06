/**
 * Resolve a stored image path for use in <img src>.
 * - Absolute http(s) URLs are returned as-is.
 * - Paths under Laravel's `storage/` may live on the PHP app; set
 *   NEXT_PUBLIC_LEGACY_ASSET_BASE_URL (e.g. https://api.example.com) so
 *   `/storage/...` resolves correctly when Next does not serve those files.
 */
export function getImagePath(path: string): string {
  if (!path || typeof path !== "string") return "";
  const p = path.trim();
  if (!p) return "";
  if (p.startsWith("//")) return `https:${p}`;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const legacyBase = (process.env.NEXT_PUBLIC_LEGACY_ASSET_BASE_URL ?? "").trim().replace(/\/$/, "");
  const noLeading = p.replace(/^\/+/, "");
  if (legacyBase && noLeading.startsWith("storage")) {
    return `${legacyBase}/${noLeading}`;
  }

  if (p.startsWith("/")) return p;
  return `/${noLeading}`;
}

