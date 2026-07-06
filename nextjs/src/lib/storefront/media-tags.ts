/** Day 9 — Media library grouping tags for storefront / commerce (use with existing media picker). */
export const STOREFRONT_MEDIA_TAGS = [
  "storefront:product_gallery",
  "storefront:collection_image",
  "storefront:hero_image",
  "storefront:logo",
  "storefront:favicon",
  "storefront:theme_asset",
] as const;

export type StorefrontMediaTag = (typeof STOREFRONT_MEDIA_TAGS)[number];
