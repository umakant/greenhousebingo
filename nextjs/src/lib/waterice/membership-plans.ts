/**
 * Purchasable Water Ice Express membership plans.
 *
 * These mirror the static plans shown on the public /memberships page and are the
 * source of truth for the membership signup + Stripe checkout (price is authoritative
 * here so the server can validate the charged amount).
 */

export type MembershipPlanSlug = "insider" | "vip";

export type MembershipPlanDef = {
  slug: MembershipPlanSlug;
  name: string;
  /** Price in dollars for one billing period. */
  price: number;
  /** Price in integer cents (authoritative amount charged via Stripe). */
  priceCents: number;
  billingPeriod: string;
  tagline: string;
};

export const MEMBERSHIP_PLANS: Record<MembershipPlanSlug, MembershipPlanDef> = {
  insider: {
    slug: "insider",
    name: "Frozen Fortune Insider",
    price: 19.99,
    priceCents: 1999,
    billingPeriod: "month",
    tagline:
      "Perfect for entrepreneurs getting started and learning the foundations of the water ice business.",
  },
  vip: {
    slug: "vip",
    name: "VIP Frozen Fortune Society",
    price: 29.99,
    priceCents: 2999,
    billingPeriod: "month",
    tagline:
      "Advanced mentorship, business growth systems, and priority opportunities for serious entrepreneurs looking to scale.",
  },
};

export function getMembershipPlan(slug: unknown): MembershipPlanDef | null {
  if (typeof slug !== "string") return null;
  const key = slug.trim().toLowerCase();
  if (key === "insider" || key === "vip") return MEMBERSHIP_PLANS[key];
  return null;
}
