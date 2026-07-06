export function getImagePath(image: string) {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return image;

  const normalized = image.replace(/^\//, "");

  // Workdo package assets are referenced relative to web root.
  if (normalized.startsWith("packages/workdo/")) return `/${normalized}`;

  // Laravel generally serves user uploads from `/storage/media/<filename>`.
  // (If your installation uses a different prefix, we can adjust later.)
  const isBasename = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(normalized);
  if (isBasename) return `/storage/media/${normalized}`;

  // Fallback: keep path stable.
  return `/${normalized}`;
}

export function getAdminSetting(settings: any, key: string): string | undefined {
  const map = settings?.admin_settings as Record<string, string> | undefined;
  if (!map) return undefined;

  // Common variants used across the Laravel codebase.
  const normalizedKey =
    key === "logo_dark" ? "logoDark" : key === "logo_light" ? "logoLight" : key;

  return map[normalizedKey] ?? map[key];
}

