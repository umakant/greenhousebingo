/** Client-safe URL helpers for compliance framework icons (no Node.js APIs). */

export function isAllowedComplianceFrameworkIconName(fileName: string): boolean {
  return /^\d+-[a-f0-9]+\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
}

/** Prefer API route so icons work when static `/uploads` is not served in production. */
export function complianceFrameworkIconServeUrl(fileName: string): string {
  return `/api/compliance/frameworks/icon/${encodeURIComponent(fileName)}`;
}

export function resolveComplianceFrameworkIconSrc(iconUrl?: string | null): string | null {
  const custom = iconUrl?.trim();
  if (!custom) return null;
  if (custom.startsWith("http://") || custom.startsWith("https://") || custom.startsWith("//")) {
    return custom.startsWith("//") ? `https:${custom}` : custom;
  }
  const legacyMatch = custom.match(/^\/uploads\/compliance\/framework-icons\/([^/?#]+)$/i);
  if (legacyMatch?.[1] && isAllowedComplianceFrameworkIconName(decodeURIComponent(legacyMatch[1]))) {
    return complianceFrameworkIconServeUrl(decodeURIComponent(legacyMatch[1]));
  }
  const apiMatch = custom.match(/^\/api\/compliance\/frameworks\/icon\/([^/?#]+)$/i);
  if (apiMatch?.[1]) {
    return complianceFrameworkIconServeUrl(decodeURIComponent(apiMatch[1]));
  }
  return custom.startsWith("/") ? custom : `/${custom.replace(/^\/+/, "")}`;
}
