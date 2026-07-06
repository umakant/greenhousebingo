import { unstable_cache } from "next/cache";

import { getSuperadminId, getSettingsForOwner } from "@/lib/settings-service";
import { getImagePath } from "@/utils/image-path";

/** Invalidate via `revalidateTag(SITE_SEO_CACHE_TAG)` after SEO settings are saved. */
export const SITE_SEO_CACHE_TAG = "site-seo";

export type SiteSeo = {
  title: string;
  description: string;
  keywords: string;
  /** Raw stored path/URL (use getImagePath when building absolute URLs). */
  image: string;
};

const FALLBACK: SiteSeo = {
  title: "PaperFlight Next.js",
  description: "Next.js migration scaffold",
  keywords: "",
  image: "",
};

async function loadSiteSeo(): Promise<SiteSeo> {
  try {
    const ownerId = await getSuperadminId();
    const s = await getSettingsForOwner(ownerId);
    const title = (s.metaTitle ?? "").trim();
    const description = (s.metaDescription ?? "").trim();
    const keywords = (s.metaKeywords ?? "").trim();
    const image = (s.metaImage ?? "").trim();
    return {
      title: title || FALLBACK.title,
      description: description || FALLBACK.description,
      keywords,
      image,
    };
  } catch {
    return FALLBACK;
  }
}

/**
 * Global SEO for the app (Settings → SEO, stored under superadmin).
 * Used by root `generateMetadata` for `<title>`, description, keywords, Open Graph, Twitter.
 */
export async function getSiteSeo(): Promise<SiteSeo> {
  return unstable_cache(loadSiteSeo, ["site-seo-v1"], {
    revalidate: 120,
    tags: [SITE_SEO_CACHE_TAG],
  })();
}

/** Resolve meta image for Next.js Metadata (relative paths OK when `metadataBase` is set). */
export function siteSeoOgImageUrl(stored: string): string {
  const trimmed = stored.trim();
  if (!trimmed) return "";
  return getImagePath(trimmed);
}
