/**
 * Max size for theme customizer and blog editor image uploads.
 * Kept strictly under 5 MiB; nginx should allow a bit more (e.g. client_max_body_size 5m;) for multipart overhead.
 */
export const STOREFRONT_EDITOR_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export function storefrontEditorImageTooLargeMessage(maxBytes: number = STOREFRONT_EDITOR_IMAGE_MAX_BYTES): string {
  const mb = maxBytes / (1024 * 1024);
  return `Image must be smaller than 5 MB (max ${mb} MB per file).`;
}

/** File exceeds allowed size after applying Settings → Storage and the 4 MB editor cap. */
export function storefrontEditorRejectTooLargeMessage(effectiveMaxBytes: number): string {
  if (effectiveMaxBytes < STOREFRONT_EDITOR_IMAGE_MAX_BYTES) {
    const kb = Math.round(effectiveMaxBytes / 1024);
    return (
      `This file exceeds the site upload limit (${kb} KB — from Superadmin Settings → Storage → Max upload size). ` +
      `Raise that value to at least 4096 (kilobytes) to allow images up to 4 MB in the theme and blog editors, or use a smaller file.`
    );
  }
  return storefrontEditorImageTooLargeMessage();
}

/** Catalog/product uploads — limited only by Settings → Storage (kilobytes). */
export function storageSettingsUploadTooLargeMessage(maxBytes: number): string {
  const kb = Math.round(maxBytes / 1024);
  return (
    `This file exceeds the site upload limit (${kb} KB — Superadmin Settings → Storage → Max upload size). ` +
    `Raise that value or use a smaller image.`
  );
}
