import flavorsData from "./flavors.data.json";
import packSizesData from "./pack-sizes.data.json";

export type FlavorCategory = "Classic" | "Fruit" | "Cream-Based" | "Candy" | "Tropical";

/**
 * A purchasable pack option for a flavor (wholesale tub configurations).
 * - `qty`    number of base 2.5-gal tubs in the pack
 * - `perTub` price multiplier applied to the flavor's per-tub price (1 = no discount,
 *            0.88 = "Save 12% / tub"). The displayed "Save X%" is derived from this.
 */
export type PackSize = {
  label: string;
  qty: number;
  perTub: number;
};

export type Flavor = {
  name: string;
  /** Stable storefront slug (DB-backed). Falls back to the name-derived slug. */
  slug: string;
  category: FlavorCategory;
  price: number;
  oldPrice: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  ingredients: string[];
  tastingNotes: string;
  pairsWith: string[];
  highlights: string[];
  packSizes: PackSize[];
};

/**
 * Default wholesale pack sizes applied to every flavor unless a product overrides
 * them via `flavorMeta.packSizes`. Shared single source of truth with the seeders.
 */
export const DEFAULT_PACK_SIZES: PackSize[] = packSizesData as PackSize[];

/**
 * Static fallback catalog. This is the single source of truth shared with the DB
 * seeder `scripts/seed-waterice-flavors.js`. The landing pages render from the
 * database when seeded and fall back to this list otherwise. Each flavor inherits
 * the default pack sizes unless its data entry overrides them.
 */
export function flavorSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type RawFlavor = Omit<Flavor, "packSizes" | "slug"> & { slug?: string; packSizes?: PackSize[] };

export const FLAVORS: Flavor[] = (flavorsData as RawFlavor[]).map((f) => ({
  ...f,
  slug: f.slug || flavorSlug(f.name),
  packSizes: Array.isArray(f.packSizes) && f.packSizes.length > 0 ? f.packSizes : DEFAULT_PACK_SIZES,
}));

export const getFlavorBySlug = (slug: string) =>
  FLAVORS.find((f) => f.slug === slug || flavorSlug(f.name) === slug);
