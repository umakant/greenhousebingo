/** Document types always permitted in the media library (LMS PDFs, compliance, forms). */
export const MEDIA_ALWAYS_ALLOWED_EXTENSIONS = ["pdf"] as const;

export function normalizeExtension(ext: string): string {
  return ext.trim().toLowerCase().replace(/^\./, "");
}

export function isMediaExtensionAllowed(extWithoutDot: string, allowedExtensions: string[]): boolean {
  const normalized = normalizeExtension(extWithoutDot);
  if (!normalized) return false;
  if ((MEDIA_ALWAYS_ALLOWED_EXTENSIONS as readonly string[]).includes(normalized)) return true;
  if (allowedExtensions.length === 0) return true;
  return allowedExtensions.includes(normalized);
}

export function acceptAttributeForExtensions(extensions?: string[]): string | undefined {
  if (!extensions?.length) return undefined;
  return extensions.map((e) => `.${normalizeExtension(e)}`).join(",");
}
