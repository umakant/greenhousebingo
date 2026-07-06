import membershipsData from "./memberships.data.json";

export type Membership = {
  slug: string;
  name: string;
  price: number;
  billingPeriod: string;
  tagline: string;
  perks: string[];
  badge: string | null;
  ctaLabel: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
};

/**
 * Static fallback membership plans. This is the single source of truth shared
 * with the DB seeder `scripts/seed-waterice-memberships.js`. The /memberships
 * page renders from the database when seeded and falls back to this list
 * otherwise.
 */
export const MEMBERSHIPS: Membership[] = membershipsData as Membership[];

/** "$19.99/month" style price label. */
export const membershipPriceLabel = (m: Pick<Membership, "price" | "billingPeriod">) =>
  `$${m.price.toFixed(2)}/${m.billingPeriod}`;
